"""Document generation endpoints"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.services.document_generation_agent import DocumentGenerationAgent
from app.core.database import get_database

router = APIRouter()

class GenerateOfferLetterRequest(BaseModel):
    candidate_data: Dict[str, Any]
    job_data: Dict[str, Any]
    offer_details: Dict[str, Any]

class GenerateContractRequest(BaseModel):
    employee_data: Dict[str, Any]
    contract_terms: Dict[str, Any]

class GenerateCertificateRequest(BaseModel):
    employee_data: Dict[str, Any]
    certificate_data: Dict[str, Any]

@router.post("/documents/offer-letter")
async def generate_offer_letter(request: GenerateOfferLetterRequest):
    """Generate offer letter"""
    try:
        agent = DocumentGenerationAgent()
        result = await agent.generate_offer_letter(
            request.candidate_data,
            request.job_data,
            request.offer_details
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/contract")
async def generate_contract(request: GenerateContractRequest):
    """Generate employment contract"""
    try:
        agent = DocumentGenerationAgent()
        result = await agent.generate_contract(
            request.employee_data,
            request.contract_terms
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/experience-certificate")
async def generate_experience_certificate(request: GenerateCertificateRequest):
    """Generate experience certificate"""
    try:
        agent = DocumentGenerationAgent()
        result = await agent.generate_experience_certificate(
            request.employee_data,
            request.certificate_data
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/salary-certificate")
async def generate_salary_certificate(request: GenerateCertificateRequest):
    """Generate salary certificate"""
    try:
        agent = DocumentGenerationAgent()
        result = await agent.generate_salary_certificate(
            request.employee_data,
            request.certificate_data
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def get_documents(document_type: Optional[str] = None, employee_id: Optional[str] = None):
    """Get generated documents"""
    db = get_database()
    
    query = {}
    if document_type:
        query["type"] = document_type
    if employee_id:
        query["employee_id"] = employee_id
    
    cursor = db["Generated_Documents"].find(query).sort("generated_at", -1)
    documents = await cursor.to_list(length=100)
    
    for doc in documents:
        doc["_id"] = str(doc["_id"])
    
    return {"success": True, "data": documents}

@router.post("/documents/{document_id}/send")
async def send_document(document_id: str, recipient_email: str):
    """Send generated document via email"""
    try:
        db = get_database()
        try:
            object_id = ObjectId(document_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid document ID")

        document = await db["Generated_Documents"].find_one({"_id": object_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        agent = DocumentGenerationAgent()
        await agent.send_document_email(document, recipient_email)
        
        await db["Generated_Documents"].update_one(
            {"_id": object_id},
            {"$set": {"status": "sent", "sent_at": datetime.now().isoformat(), "sent_to": recipient_email}}
        )

        return {"success": True, "message": "Document sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

