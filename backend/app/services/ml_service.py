import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from app.core.config import settings
from app.core.database import get_database
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Iterable, Tuple, Set

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

SCORE_KEYS = ["score", "Score", "rating", "Rating", "performance_score", "PerformanceScore", "PerformanceRating", "value", "Value"]
DATE_KEYS = [
    "Review_Date",
    "review_date",
    "ReviewDate",
    "Date",
    "date",
    "Period",
    "period",
    "Month",
    "month",
    "timestamp",
    "Timestamp",
]
EMPLOYEE_ID_KEYS = ["Employee_ID", "EmployeeID", "employee_id", "employeeId", "EmployeeId", "id"]
MODEL_VERSION = "linear_regression_v1"
PREDICTION_COLLECTION = "Performance_predictions"


def _collect_employee_identifiers(employee: Optional[Dict[str, Any]], fallback_id: str) -> Set[str]:
    identifiers: Set[str] = set()
    if fallback_id:
        identifiers.add(str(fallback_id).strip())
    if not employee:
        return {identifier for identifier in identifiers if identifier}
    for key in EMPLOYEE_ID_KEYS + ["_id"]:
        value = employee.get(key)
        if value is None:
            continue
        if key == "_id":
            value = str(value)
        text = str(value).strip()
        if text:
            identifiers.add(text)
    return {identifier for identifier in identifiers if identifier}


def _ensure_datetime(value: Any) -> Optional[datetime]:
    if not value and value != 0:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value)
        except Exception:
            return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            dt = pd.to_datetime(text, errors="coerce")
            if pd.isna(dt):
                return None
            if hasattr(dt, "to_pydatetime"):
                return dt.to_pydatetime()
            if isinstance(dt, datetime):
                return dt
        except Exception:
            return None
    return None


def _coerce_float(value: Any) -> Optional[float]:
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    if isinstance(value, (int, float, np.number)):
        return float(value)
    try:
        return float(str(value).strip())
    except (ValueError, TypeError):
        return None


def _extract_score(source: Dict[str, Any]) -> Optional[float]:
    for key in SCORE_KEYS:
        if key in source:
            score = _coerce_float(source[key])
            if score is not None:
                return score
    return None


def _extract_date(source: Dict[str, Any]) -> Optional[datetime]:
    for key in DATE_KEYS:
        if key in source:
            dt = _ensure_datetime(source[key])
            if dt:
                return dt
    # Fallback when year/month fields exist
    year = source.get("Year") or source.get("year") or source.get("Review_Year")
    month = source.get("Month") or source.get("month") or source.get("Review_Month")
    if isinstance(year, (int, float)) and isinstance(month, (int, float)):
        try:
            return datetime(int(year), int(month), 1)
        except Exception:
            return None
    return None


def _prepare_performance_history(
    employee: Optional[Dict[str, Any]],
    performance_docs: Iterable[Dict[str, Any]],
) -> List[Tuple[datetime, float]]:
    data_points: List[Tuple[Optional[datetime], float]] = []

    for doc in performance_docs:
        score = _extract_score(doc)
        if score is None:
            continue
        dt = _extract_date(doc)
        data_points.append((dt, score))

    history_entries = None
    if employee:
        history_entries = (
            employee.get("PerformanceHistory")
            or employee.get("performance_history")
            or employee.get("performanceHistory")
        )
        if isinstance(history_entries, list):
            for entry in history_entries:
                if isinstance(entry, dict):
                    score = _extract_score(entry)
                    if score is None:
                        continue
                    dt = _extract_date(entry)
                    if dt is None and "period" in entry and isinstance(entry["period"], str):
                        dt = _ensure_datetime(entry["period"])
                    data_points.append((dt, score))
        current_rating = _coerce_float(employee.get("PerformanceRating") or employee.get("performance_rating"))
        if current_rating is not None:
            dt = _ensure_datetime(
                employee.get("LastPerformanceReviewDate")
                or employee.get("last_review_date")
                or employee.get("LastReviewDate")
            )
            data_points.append((dt, current_rating))

    if not data_points:
        return []

    # If all dates missing, create synthetic monthly timeline
    if all(point[0] is None for point in data_points):
        base_date = datetime.utcnow() - timedelta(days=30 * (len(data_points) - 1))
        with_dates = []
        for idx, (_, score) in enumerate(data_points):
            with_dates.append((base_date + timedelta(days=30 * idx), score))
        data_points = with_dates
    else:
        filled_points: List[Tuple[datetime, float]] = []
        last_known = None
        for dt, score in sorted(data_points, key=lambda item: item[0] or datetime.min):
            if dt is None:
                if last_known is None:
                    last_known = datetime.utcnow()
                else:
                    last_known = last_known + timedelta(days=30)
                filled_points.append((last_known, score))
            else:
                last_known = dt
                filled_points.append((dt, score))
        data_points = filled_points

    # Deduplicate by date (keep latest value)
    dedup: Dict[datetime, float] = {}
    for dt, score in data_points:
        dedup[dt] = score

    sorted_points = sorted(dedup.items(), key=lambda item: item[0])
    return [(dt, float(score)) for dt, score in sorted_points]


def _is_prediction_record_stale(record: Dict[str, Any], max_age_hours: int = 24) -> bool:
    generated_at = record.get("generated_at")
    if isinstance(generated_at, dict) and "$date" in generated_at:
        generated_at = _ensure_datetime(generated_at["$date"])
    if isinstance(generated_at, str):
        generated_at = _ensure_datetime(generated_at)
    if not isinstance(generated_at, datetime):
        return True
    return generated_at < datetime.utcnow() - timedelta(hours=max_age_hours)


def _determine_trend(predictions: List[float]) -> str:
    if len(predictions) < 2:
        return "stable"
    first, last = predictions[0], predictions[-1]
    if last > first + 0.5:
        return "increasing"
    if last < first - 0.5:
        return "decreasing"
    return "stable"


async def _generate_performance_prediction_record(
    employee: Dict[str, Any],
    possible_ids: Set[str],
    periods: int = 6,
) -> Optional[Dict[str, Any]]:
    db = get_database()

    query_or = []
    for key in EMPLOYEE_ID_KEYS:
        query_or.append({key: {"$in": list(possible_ids)}})
    performance_docs: List[Dict[str, Any]] = []
    if query_or:
        performance_docs = await db["Performance"].find({"$or": query_or}).sort("Review_Date", 1).to_list(length=None)

    history_points = _prepare_performance_history(employee, performance_docs)
    if len(history_points) == 0:
        return None

    history_dates = [point[0] for point in history_points]
    history_scores = np.array([point[1] for point in history_points], dtype=float)

    # Ensure at least constant model when insufficient data
    model = None
    metrics: Dict[str, float] = {}
    predictions = np.array([])

    if len(history_scores) >= 2:
        indices = np.arange(len(history_scores)).reshape(-1, 1)
        try:
            if len(history_scores) >= 3:
                split_index = max(1, len(history_scores) - max(1, int(round(len(history_scores) * 0.2))))
                if split_index >= len(history_scores):
                    split_index = len(history_scores) - 1
                X_train, y_train = indices[:split_index], history_scores[:split_index]
                X_test, y_test = indices[split_index:], history_scores[split_index:]
            else:
                X_train, y_train = indices, history_scores
                X_test, y_test = indices, history_scores

            model = LinearRegression()
            model.fit(X_train, y_train)
            y_test_pred = model.predict(X_test)
            if len(y_test) > 0:
                metrics["mae"] = float(mean_absolute_error(y_test, y_test_pred))
                metrics["rmse"] = float(np.sqrt(mean_squared_error(y_test, y_test_pred)))

            future_idx = np.arange(len(history_scores), len(history_scores) + periods).reshape(-1, 1)
            predictions = model.predict(future_idx)
        except Exception as exc:
            logger.warning(f"Performance prediction model training failed for employee {possible_ids}: {exc}")
            model = None

    if model is None or predictions.size == 0:
        baseline = history_scores[-1]
        predictions = np.repeat(baseline, periods)

    predictions = np.clip(predictions, 0, 100)

    # Determine canonical employee id
    canonical_id = next(iter(sorted(possible_ids))) if possible_ids else employee.get("Employee_ID") or employee.get("EmployeeID")
    canonical_id = str(canonical_id) if canonical_id else employee.get("_id")
    canonical_id = str(canonical_id)

    # Build forecast dates
    last_date = history_dates[-1] if history_dates else datetime.utcnow()
    if not isinstance(last_date, datetime):
        last_date = datetime.utcnow()
    forecast_dates = [last_date + timedelta(days=30 * (idx + 1)) for idx in range(periods)]

    historical_payload = [
        {
            "date": dt.isoformat(),
            "score": round(float(score), 2),
        }
        for dt, score in history_points[-12:]
    ]

    predictions_payload = [
        {
            "date": forecast_dates[idx].isoformat(),
            "predicted_score": round(float(score), 2),
        }
        for idx, score in enumerate(predictions.tolist())
    ]

    current_score = round(float(history_scores[-1]), 2)
    trend_label = _determine_trend(predictions.tolist() if len(predictions) > 0 else history_scores.tolist())

    record = {
        "employee_id": canonical_id,
        "employee_ids": list(possible_ids),
        "generated_at": datetime.utcnow(),
        "model_version": MODEL_VERSION,
        "periods": periods,
        "history_points": len(history_scores),
        "historical": historical_payload,
        "predictions": predictions_payload,
        "current_score": current_score,
        "trend": trend_label,
        "metrics": metrics,
    }

    await db[PREDICTION_COLLECTION].update_one(
        {"employee_id": canonical_id, "periods": periods},
        {"$set": record},
        upsert=True,
    )

    stored = await db[PREDICTION_COLLECTION].find_one({"employee_id": canonical_id, "periods": periods})
    return stored or record


def _format_prediction_response(record: Dict[str, Any]) -> Dict[str, Any]:
    generated_at = record.get("generated_at")
    if isinstance(generated_at, datetime):
        generated_at_iso = generated_at.isoformat()
    else:
        generated_at_iso = _ensure_datetime(generated_at)
        generated_at_iso = generated_at_iso.isoformat() if generated_at_iso else None

    predictions = record.get("predictions", [])
    formatted_predictions = []
    for entry in predictions:
        date_value = entry.get("date")
        date_dt = _ensure_datetime(date_value)
        formatted_predictions.append(
            {
                "date": (date_dt.isoformat() if date_dt else date_value),
                "predicted_score": round(float(entry.get("predicted_score", 0.0)), 2),
            }
        )

    historical_entries = record.get("historical", [])
    formatted_history = []
    for entry in historical_entries:
        date_value = entry.get("date")
        date_dt = _ensure_datetime(date_value)
        formatted_history.append(
            {
                "date": (date_dt.isoformat() if date_dt else date_value),
                "score": round(float(entry.get("score", 0.0)), 2),
            }
        )

    return {
        "employee_id": str(record.get("employee_id")),
        "model_version": record.get("model_version"),
        "generated_at": generated_at_iso,
        "current_performance_score": round(float(record.get("current_score", 0.0)), 2),
        "trend": record.get("trend", "stable"),
        "forecast": formatted_predictions,
        "historical": formatted_history,
        "metrics": record.get("metrics", {}),
        "history_points": record.get("history_points", len(formatted_history)),
    }

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

