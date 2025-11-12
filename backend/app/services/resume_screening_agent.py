"""
Resume Screening Agent - Automatically screens resumes and matches to job requirements
"""
import asyncio
import json
import re
from datetime import datetime
from typing import Literal, Dict, Any, Optional
from langgraph.graph import StateGraph
from app.core.config import settings
from bson import ObjectId
from app.core.database import get_database
from app.services.email_service import send_email
import logging
from pathlib import Path
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

class ResumeScreeningAgent:
    """Agent for automated resume screening and candidate matching"""
    
    def __init__(self):
        # Try to load a pre-trained similarity model/pipeline if available
        self.similarity_model = None
        possible_paths = [
            Path(getattr(settings, "MODEL_DIR", "models")) / "resume_job_similarity.pkl",
            Path("backend") / "models" / "resume_job_similarity.pkl",
            Path("models") / "resume_job_similarity.pkl",
            Path("../models") / "resume_job_similarity.pkl",
        ]
        for p in possible_paths:
            try:
                if p.exists():
                    self.similarity_model = joblib.load(p)
                    logger.info(f"✅ Loaded resume similarity model from {p}")
                    break
            except Exception as e:
                logger.warning(f"Could not load similarity model from {p}: {e}")
    
    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Try to extract a JSON object from arbitrary text returned by the model."""
        try:
            # Fast path: try direct load first
            return json.loads(text)
        except Exception:
            pass

        # Strip common markdown fences
        cleaned = re.sub(r"```json\s*", "", text)
        cleaned = re.sub(r"```\s*", "", cleaned)
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Heuristic: find the outermost JSON object boundaries
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1 and end > start:
            candidate = cleaned[start:end + 1]
            try:
                return json.loads(candidate)
            except Exception:
                # Attempt minor normalizations
                normalized = candidate.replace("\'", '"').replace("'", '"')
                normalized = re.sub(r",\s*([}\]])", r"\1", normalized)  # remove trailing commas
                try:
                    return json.loads(normalized)
                except Exception:
                    return None
        return None

    def _heuristic_parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Fallback lightweight parser to avoid total failure when LLM parsing fails."""
        email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", resume_text)
        phone_match = re.search(r"(\+?\d[\d\s().-]{7,}\d)", resume_text)
        # Try to detect a Skills: line
        skills: list[str] = []
        skills_line = None
        for line in resume_text.splitlines():
            if re.search(r"^\s*Skills\s*[:|-]", line, flags=re.IGNORECASE):
                skills_line = line
                break
        if skills_line:
            parts = skills_line.split(':', 1)
            if len(parts) == 2:
                skills = [s.strip() for s in parts[1].replace('•', ',').replace('|', ',').split(',') if s.strip()]

        # Name heuristic: first non-empty line
        name = "Unknown"
        for line in resume_text.splitlines():
            candidate = line.strip()
            if candidate:
                name = candidate[:120]
                break

        return {
            "name": name,
            "email": email_match.group(0) if email_match else "",
            "phone": phone_match.group(0) if phone_match else "",
            "skills": skills,
            "experience_years": 0,
            "education": "",
            "previous_roles": [],
            "certifications": [],
            "summary": "",
        }

    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Extract basic info from resume text without external APIs."""
        # Use heuristic parser to avoid API key dependencies
        data = self._heuristic_parse_resume(resume_text)
        # Ensure defaults
        data.setdefault("name", "Unknown")
        data.setdefault("email", "")
        data.setdefault("phone", "")
        data.setdefault("skills", [])
        data.setdefault("experience_years", 0)
        data.setdefault("education", "")
        data.setdefault("previous_roles", [])
        data.setdefault("certifications", [])
        data.setdefault("summary", "")
        return data
    
    async def score_candidate(self, candidate_data: Dict[str, Any], job_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Score candidate using local similarity model or TF-IDF cosine similarity."""
        # Build text corpora
        candidate_text_parts = [
            candidate_data.get("summary", ""),
            " ".join(candidate_data.get("skills", [])),
            " ".join(candidate_data.get("previous_roles", [])),
            candidate_data.get("education", ""),
        ]
        candidate_text = " \n".join([p for p in candidate_text_parts if p])

        required_skills = job_requirements.get("required_skills", [])
        job_text_parts = [
            " ".join(required_skills),
            str(job_requirements.get("education", "")),
            str(job_requirements.get("position", "")),
            str(job_requirements.get("department", "")),
        ]
        job_text = " \n".join([p for p in job_text_parts if p])

        # Compute similarity
        try:
            sim_score = 0.0
            if self.similarity_model is not None:
                # Attempt to use a pre-trained vectorizer/pipeline
                try:
                    if hasattr(self.similarity_model, "transform"):
                        vec = self.similarity_model
                        X = vec.transform([candidate_text, job_text])
                        sim_score = float(cosine_similarity(X[0], X[1])[0][0])
                    elif isinstance(self.similarity_model, dict) and "vectorizer" in self.similarity_model:
                        vec = self.similarity_model["vectorizer"]
                        X = vec.transform([candidate_text, job_text])
                        sim_score = float(cosine_similarity(X[0], X[1])[0][0])
                    else:
                        # Fallback to ad-hoc TF-IDF
                        raise ValueError("Unsupported similarity model type")
                except Exception as e:
                    logger.warning(f"Similarity model use failed, falling back to TF-IDF: {e}")
                    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
                    X = vectorizer.fit_transform([candidate_text, job_text])
                    sim_score = float(cosine_similarity(X[0], X[1])[0][0])
            else:
                vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
                X = vectorizer.fit_transform([candidate_text, job_text])
                sim_score = float(cosine_similarity(X[0], X[1])[0][0])
        except Exception as e:
            logger.error(f"Error computing similarity: {e}")
            sim_score = 0.0

        # Convert similarity 0-1 to 0-100
        skills_match = int(round(sim_score * 100))

        # Simple experience and education heuristics
        required_exp = int(job_requirements.get("experience_years", 0) or 0)
        candidate_exp = int(candidate_data.get("experience_years", 0) or 0)
        experience_match = 100 if candidate_exp >= required_exp else max(0, int(candidate_exp / max(1, required_exp) * 100)) if required_exp > 0 else 50

        education_required = str(job_requirements.get("education", "")).lower()
        candidate_edu = str(candidate_data.get("education", "")).lower()
        education_match = 100 if (education_required and education_required.split()[0] in candidate_edu) else 60 if education_required else 50

        # Aggregate overall score with weights
        overall_score = int(round(0.6 * skills_match + 0.25 * experience_match + 0.15 * education_match))

        # Identify missing skills
        candidate_skills_lower = {s.strip().lower() for s in candidate_data.get("skills", []) if isinstance(s, str)}
        missing_skills = [s for s in required_skills if isinstance(s, str) and s.strip() and s.strip().lower() not in candidate_skills_lower]

        recommendation = "hire" if overall_score >= 80 else "maybe" if overall_score >= 60 else "reject"
        strengths = ["strong skill alignment"] if skills_match >= 70 else []
        if experience_match >= 80:
            strengths.append("meets experience requirements")
        weaknesses = []
        if skills_match < 50:
            weaknesses.append("low skills match")
        if education_match < 60:
            weaknesses.append("education below requirement")

        return {
            "overall_score": overall_score,
            "skills_match": skills_match,
            "experience_match": experience_match,
            "education_match": education_match,
            "recommendation": recommendation,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "missing_skills": missing_skills[:10],
            "reason": "Similarity-based scoring without external AI",
        }
    
    async def screen_resume(self, resume_text: str, job_id: str) -> Dict[str, Any]:
        """Complete resume screening workflow"""
        db = get_database()
        
        # Get job requirements (support both JobID and _id strings)
        job = await db["Jobs"].find_one({"JobID": job_id})
        if not job:
            # Try treating job_id as Mongo ObjectId
            try:
                job = await db["Jobs"].find_one({"_id": ObjectId(job_id)})
            except Exception:
                job = None
        if not job:
            return {"error": "Job not found"}
        
        job_requirements = {
            "required_skills": job.get("RequiredSkills", []),
            "experience_years": job.get("ExperienceRequired", 0),
            "education": job.get("EducationRequired", ""),
            "position": job.get("Position", ""),
            "department": job.get("Department", "")
        }
        
        # Parse resume
        candidate_data = await self.parse_resume(resume_text)
        if not candidate_data or not isinstance(candidate_data, dict):
            candidate_data = {}
        # Guarantee minimum structure so screening never hard-fails on parsing
        candidate_data.setdefault("name", "Unknown")
        candidate_data.setdefault("email", "")
        candidate_data.setdefault("phone", "")
        candidate_data.setdefault("skills", [])
        candidate_data.setdefault("experience_years", 0)
        candidate_data.setdefault("education", "")
        candidate_data.setdefault("previous_roles", [])
        candidate_data.setdefault("certifications", [])
        candidate_data.setdefault("summary", "")
        
        # Score candidate
        score = await self.score_candidate(candidate_data, job_requirements)
        
        # Save screening result
        screening_result = {
            "job_id": job_id,
            "candidate_name": candidate_data.get("name", "Unknown"),
            "candidate_email": candidate_data.get("email", ""),
            "candidate_data": candidate_data,
            "score": score,
            "screening_date": datetime.now().isoformat(),
            "status": "completed"
        }
        
        result = await db["Resume_screening"].insert_one(screening_result)
        screening_result["_id"] = str(result.inserted_id)
        
        # Auto-action based on score
        if score.get("overall_score", 0) >= 80:
            # High score - auto-advance to interview
            await self._auto_advance_candidate(candidate_data, job_id, screening_result)
        elif score.get("overall_score", 0) >= 60:
            # Medium score - notify HR for review
            await self._notify_hr_review(candidate_data, job_id, score)
        
        return screening_result
    
    async def _auto_advance_candidate(self, candidate_data: Dict, job_id: str, screening_result: Dict):
        """Automatically advance high-scoring candidates"""
        db = get_database()
        
        # Add to Candidates collection
        candidate = {
            "Name": candidate_data.get("name"),
            "Email": candidate_data.get("email"),
            "Phone": candidate_data.get("phone"),
            "Skills": candidate_data.get("skills", []),
            "Status": "Interview Scheduled",
            "JobID": job_id,
            "ScreeningScore": screening_result["score"]["overall_score"],
            "ScreeningResult": screening_result["_id"]
        }
        
        await db["Candidates"].insert_one(candidate)
        
        # Send automated email
        subject = f"Interview Invitation - {candidate_data.get('name')}"
        email_body = f"""Dear {candidate_data.get('name')},

Congratulations! Your application has been shortlisted.

We would like to invite you for an interview. Our team will contact you shortly to schedule a convenient time.

Best regards,
TalentFlow HR Team"""
        
        await send_email(
            candidate_data.get("email", ""),
            subject,
            email_body
        )
    
    async def _notify_hr_review(self, candidate_data: Dict, job_id: str, score: Dict):
        """Notify HR team for manual review"""
        hr_email = settings.SENDER_EMAIL  # Could be configurable
        subject = f"Manual Review Required - {candidate_data.get('name')}"
        email_body = f"""HR Team,

A candidate requires manual review:

Candidate: {candidate_data.get('name')}
Email: {candidate_data.get('email')}
Score: {score.get('overall_score', 0)}/100
Recommendation: {score.get('recommendation', 'maybe')}

Reason: {score.get('reason', 'N/A')}

Please review in the system.
"""
        
        await send_email(hr_email, subject, email_body)

# LangGraph Workflow for Resume Screening
async def route_screening(state: dict) -> Literal["parse_resume", "score_candidate", "save_result", "notify"]:
    """Route screening workflow steps"""
    step = state.get("step", "parse_resume")
    return step

async def parse_resume_node(state: dict):
    """Parse resume text"""
    agent = ResumeScreeningAgent()
    resume_text = state.get("resume_text", "")
    
    candidate_data = await agent.parse_resume(resume_text)
    # Ensure minimum structure in workflow too
    if not candidate_data or not isinstance(candidate_data, dict):
        candidate_data = {}
    candidate_data.setdefault("name", "Unknown")
    candidate_data.setdefault("email", "")
    candidate_data.setdefault("phone", "")
    candidate_data.setdefault("skills", [])
    candidate_data.setdefault("experience_years", 0)
    return {"candidate_data": candidate_data, "step": "score_candidate"}

async def score_candidate_node(state: dict):
    """Score candidate against job"""
    agent = ResumeScreeningAgent()
    candidate_data = state.get("candidate_data", {})
    job_id = state.get("job_id", "")
    
    db = get_database()
    try:
        job = await db["Jobs"].find_one({"JobID": job_id})
        if not job:
            job = await db["Jobs"].find_one({"_id": ObjectId(job_id)})
    except Exception:
        job = None
    
    if not job:
        return {"error": "Job not found", "step": "__end__"}
    
    job_requirements = {
        "required_skills": job.get("RequiredSkills", []),
        "experience_years": job.get("ExperienceRequired", 0),
    }
    
    score = await agent.score_candidate(candidate_data, job_requirements)
    return {"score": score, "step": "save_result"}

async def save_result_node(state: dict):
    """Save screening result"""
    db = get_database()
    candidate_data = state.get("candidate_data", {})
    score = state.get("score", {})
    job_id = state.get("job_id", "")
    
    result = {
        "job_id": job_id,
        "candidate_data": candidate_data,
        "score": score,
        "status": "completed"
    }
    
    await db["Resume_screening"].insert_one(result)
    
    return {"result": result, "step": "notify"}

async def notify_node(state: dict):
    """Send notifications based on score"""
    score = state.get("score", {})
    candidate_data = state.get("candidate_data", {})
    
    if score.get("overall_score", 0) >= 80:
        # High score - notify candidate
        subject = "Interview Invitation"
        body = f"Dear {candidate_data.get('name')}, your application has been shortlisted!"
        await send_email(candidate_data.get("email", ""), subject, body)
    
    return {"step": "__end__"}

def build_screening_graph():
    """Build LangGraph for resume screening"""
    graph = StateGraph(dict)
    
    graph.add_node("parse_resume", parse_resume_node)
    graph.add_node("score_candidate", score_candidate_node)
    graph.add_node("save_result", save_result_node)
    graph.add_node("notify", notify_node)
    
    graph.add_conditional_edges(
        "__start__",
        route_screening,
        {
            "parse_resume": "parse_resume",
            "score_candidate": "score_candidate",
            "save_result": "save_result",
            "notify": "notify"
        }
    )
    
    graph.add_edge("parse_resume", "score_candidate")
    graph.add_edge("score_candidate", "save_result")
    graph.add_edge("save_result", "notify")
    graph.add_edge("notify", "__end__")
    
    return graph.compile()

