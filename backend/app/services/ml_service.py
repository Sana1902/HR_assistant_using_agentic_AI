import joblib
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
from app.core.config import settings
from app.core.database import get_database
import logging

logger = logging.getLogger(__name__)

# Global model variables
attrition_model = None
label_encoders = {}
feature_columns = []
MODEL_LOADED = False

def load_models():
    """Load ML models from files"""
    global attrition_model, label_encoders, feature_columns, MODEL_LOADED
    
    try:
        # Try multiple paths
        model_paths = [
            Path(settings.MODEL_DIR) / "attrition_model.pkl",
            Path("models") / "attrition_model.pkl",
            Path("../models") / "attrition_model.pkl",
        ]
        
        encoders_paths = [
            Path(settings.MODEL_DIR) / "label_encoders (1).pkl",
            Path(settings.MODEL_DIR) / "label_encoders.pkl",
            Path("models") / "label_encoders (1).pkl",
            Path("models") / "label_encoders.pkl",
            Path("../models") / "label_encoders (1).pkl",
        ]
        
        features_paths = [
            Path(settings.MODEL_DIR) / "feature_columns.pkl",
            Path("models") / "feature_columns.pkl",
            Path("../models") / "feature_columns.pkl",
        ]
        
        # Load model
        for path in model_paths:
            if path.exists():
                attrition_model = joblib.load(path)
                logger.info(f"✅ Loaded attrition model from {path}")
                break
        
        # Load encoders (handle dict vs list)
        for path in encoders_paths:
            if path.exists():
                try:
                    label_encoders = joblib.load(path)
                    # Handle case where encoders might be a dict or list
                    if not isinstance(label_encoders, dict):
                        label_encoders = {}
                    logger.info(f"✅ Loaded label encoders from {path}")
                    break
                except Exception as e:
                    logger.warning(f"Error loading encoders from {path}: {e}")
                    continue
        
        # Load feature columns
        for path in features_paths:
            if path.exists():
                feature_columns = joblib.load(path)
                logger.info(f"✅ Loaded feature columns from {path}")
                break
        
        if attrition_model and feature_columns:
            MODEL_LOADED = True
            logger.info("✅ ML models loaded successfully")
        else:
            logger.warning("⚠️ Some model files not found")
            
    except Exception as e:
        logger.error(f"⚠️ Error loading models: {e}")
        MODEL_LOADED = False

# Load models on import
load_models()

async def predict_attrition_for_employee(employee_id: str):
    """Predict attrition risk for a single employee"""
    if not MODEL_LOADED:
        raise Exception("ML model not available")
    
    db = get_database()
    
    # Fetch employee data from Attrition collection
    employee_data = await db["Attrition"].find_one({"EmployeeID": employee_id})
    if not employee_data:
        raise Exception(f"Employee {employee_id} not found in Attrition collection")
    
    # Convert to DataFrame
    df = pd.DataFrame([employee_data])
    df = df.drop('_id', axis=1, errors='ignore')
    
    # Encode categorical variables
    df_encoded = df.copy()
    for col in df_encoded.select_dtypes(include=['object']).columns:
        if col in label_encoders:
            le = label_encoders[col]
            df_encoded[col] = df_encoded[col].apply(
                lambda x: le.transform([x])[0] if x in le.classes_ else -1
            )
        else:
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
    
    # Ensure all features present
    for col in feature_columns:
        if col not in df_encoded.columns:
            df_encoded[col] = 0
    
    # Predict
    X_pred = df_encoded[feature_columns]
    prob = attrition_model.predict_proba(X_pred)[0][1]
    risk_score = int(prob * 100)
    
    risk_level = "high" if risk_score > 70 else "medium" if risk_score > 40 else "low"
    
    return {
        "employee_id": employee_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "probability": float(prob)
    }

