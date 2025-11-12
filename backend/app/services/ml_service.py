import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
from app.core.config import settings
from app.core.database import get_database
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

# Global model variables
attrition_model = None
label_encoders = {}
feature_columns = []
MODEL_LOADED = False

# ARIMA model variables
arima_models: Dict[str, Any] = {}
ARIMA_MODEL_LOADED = False

def load_models():
    """Load ML models from files"""
    global attrition_model, label_encoders, feature_columns, MODEL_LOADED
    global arima_models, ARIMA_MODEL_LOADED
    
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
        
        # ARIMA model paths
        arima_paths = [
            Path(settings.MODEL_DIR) / "employee_arima_models.pkl",
            Path("models") / "employee_arima_models.pkl",
            Path("../models") / "employee_arima_models.pkl",
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
        
        # Load ARIMA models
        for path in arima_paths:
            if path.exists():
                try:
                    arima_models = joblib.load(path)
                    if isinstance(arima_models, dict):
                        ARIMA_MODEL_LOADED = True
                        logger.info(f"✅ Loaded ARIMA models from {path} ({len(arima_models)} models)")
                    else:
                        logger.warning(f"ARIMA models file is not a dictionary: {type(arima_models)}")
                    break
                except Exception as e:
                    logger.warning(f"Error loading ARIMA models from {path}: {e}")
                    continue
        
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

async def predict_performance_for_employee(employee_id: str, periods: int = 6) -> Dict[str, Any]:
    """Predict performance for a single employee using ARIMA model"""
    if not ARIMA_MODEL_LOADED:
        raise Exception("ARIMA model not available")
    
    db = get_database()
    
    # Try to find employee in employee collection
    employee = await db["employee"].find_one({
        "$or": [
            {"Employee_ID": employee_id},
            {"EmployeeID": employee_id},
            {"employee_id": employee_id}
        ]
    })
    
    if not employee:
        raise Exception(f"Employee {employee_id} not found")
    
    # Get the actual employee ID used in the model
    model_employee_id = employee.get("Employee_ID") or employee.get("EmployeeID") or employee_id
    
    # Check if ARIMA model exists for this employee
    if model_employee_id not in arima_models:
        # Try alternative ID formats
        for alt_id in [employee.get("EmployeeID"), employee.get("employee_id"), employee_id]:
            if alt_id and alt_id in arima_models:
                model_employee_id = alt_id
                break
        else:
            raise Exception(f"ARIMA model not found for employee {employee_id}")
    
    arima_model = arima_models[model_employee_id]
    
    try:
        # Generate forecast for the specified number of periods
        # Handle different ARIMA model types (statsmodels ARIMA/ARIMAResults)
        if hasattr(arima_model, 'forecast'):
            forecast = arima_model.forecast(steps=periods)
        elif hasattr(arima_model, 'predict'):
            # Some models use predict instead
            forecast = arima_model.predict(start=0, end=periods-1)
        else:
            raise Exception("ARIMA model does not have forecast or predict method")
        
        # Convert to list format
        if hasattr(forecast, 'tolist'):
            forecast_values = forecast.tolist()
        elif hasattr(forecast, 'values'):
            forecast_values = forecast.values.tolist() if hasattr(forecast.values, 'tolist') else list(forecast.values)
        elif isinstance(forecast, (list, tuple)):
            forecast_values = list(forecast)
        elif isinstance(forecast, np.ndarray):
            forecast_values = forecast.tolist()
        else:
            forecast_values = [float(forecast)] * periods
        
        # Get historical performance data if available
        historical_data = []
        if "PerformanceRating" in employee or "PerformanceHistory" in employee:
            # Try to get historical performance
            perf_history = employee.get("PerformanceHistory", [])
            if isinstance(perf_history, list) and len(perf_history) > 0:
                historical_data = perf_history[-6:]  # Last 6 months
        
        # Generate dates for forecast
        current_date = datetime.now()
        forecast_dates = []
        for i in range(periods):
            forecast_date = current_date + timedelta(days=30 * (i + 1))
            forecast_dates.append(forecast_date.strftime("%Y-%m-%d"))
        
        # Calculate current performance score (average of last forecast or use current rating)
        current_score = float(forecast_values[0]) if len(forecast_values) > 0 else 75.0
        if "PerformanceRating" in employee:
            try:
                current_rating = float(employee["PerformanceRating"])
                current_score = (current_score + current_rating) / 2
            except (ValueError, TypeError):
                pass
        
        # Ensure score is within reasonable bounds (0-100)
        current_score = max(0, min(100, current_score))
        
        return {
            "employee_id": employee_id,
            "current_performance_score": round(current_score, 2),
            "forecast": [
                {
                    "date": date,
                    "predicted_score": round(score, 2)
                }
                for date, score in zip(forecast_dates, forecast_values)
            ],
            "trend": "increasing" if len(forecast_values) > 1 and forecast_values[-1] > forecast_values[0] else "decreasing" if len(forecast_values) > 1 and forecast_values[-1] < forecast_values[0] else "stable"
        }
    except Exception as e:
        logger.error(f"Error predicting performance for employee {employee_id}: {e}")
        raise Exception(f"Error generating performance prediction: {str(e)}")

async def get_performance_trend_data(periods: int = 6) -> List[Dict[str, Any]]:
    """Get performance trend data for dashboard (aggregated across all employees)"""
    if not ARIMA_MODEL_LOADED:
        return []
    
    db = get_database()
    
    try:
        # Get all employees
        employees = await db["employee"].find({}).to_list(length=None)
        
        if not employees:
            return []
        
        # Aggregate predictions for all employees
        monthly_scores = {}
        current_date = datetime.now()
        
        for employee in employees:
            emp_id = employee.get("Employee_ID") or employee.get("EmployeeID")
            if not emp_id:
                continue
            
            # Check if model exists
            if emp_id not in arima_models:
                continue
            
            try:
                arima_model = arima_models[emp_id]
                # Handle different ARIMA model types
                if hasattr(arima_model, 'forecast'):
                    forecast = arima_model.forecast(steps=periods)
                elif hasattr(arima_model, 'predict'):
                    forecast = arima_model.predict(start=0, end=periods-1)
                else:
                    continue
                
                # Convert to list format
                if hasattr(forecast, 'tolist'):
                    forecast_values = forecast.tolist()
                elif hasattr(forecast, 'values'):
                    forecast_values = forecast.values.tolist() if hasattr(forecast.values, 'tolist') else list(forecast.values)
                elif isinstance(forecast, (list, tuple)):
                    forecast_values = list(forecast)
                elif isinstance(forecast, np.ndarray):
                    forecast_values = forecast.tolist()
                else:
                    continue
                
                # Aggregate by month
                for i, score in enumerate(forecast_values):
                    month_key = (current_date + timedelta(days=30 * (i + 1))).strftime("%Y-%m")
                    if month_key not in monthly_scores:
                        monthly_scores[month_key] = []
                    monthly_scores[month_key].append(float(score))
            except Exception as e:
                logger.warning(f"Error getting forecast for employee {emp_id}: {e}")
                continue
        
        # Calculate averages and format
        trend_data = []
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        sorted_months = sorted(monthly_scores.keys())[:periods]
        for month_key in sorted_months:
            avg_score = np.mean(monthly_scores[month_key])
            month_date = datetime.strptime(month_key, "%Y-%m")
            trend_data.append({
                "month": month_names[month_date.month - 1],
                "performance": round(avg_score, 2),
                "target": 80.0  # Default target
            })
        
        return trend_data
    except Exception as e:
        logger.error(f"Error getting performance trend data: {e}")
        return []

