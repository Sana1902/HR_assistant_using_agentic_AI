from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
import random
from app.core.database import get_database
from bson import ObjectId

router = APIRouter()

def serialize_document(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=1, description="Full name of the employee")
    department: str = Field(..., min_length=1, description="Department name")
    position: str = Field(..., min_length=1, description="Employee position or title")
    email: Optional[EmailStr] = Field(None, description="Corporate email address")
    phone: Optional[str] = Field(None, description="Contact phone number")
    date_of_joining: Optional[str] = Field(None, alias="dateOfJoining", description="Date of joining (ISO format)")
    employment_type: Optional[str] = Field(None, alias="employmentType", description="Employment type e.g. Full-time")
    manager: Optional[str] = Field(None, description="Manager name or ID")
    employee_id: Optional[str] = Field(None, alias="employeeId", description="Custom employee identifier")

    class Config:
        allow_population_by_field_name = True


def generate_employee_id() -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    suffix = random.randint(100, 999)
    return f"EMP-{timestamp}-{suffix}"


def map_employee_to_document(payload: EmployeeCreate) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    document: Dict[str, Any] = {
        "Employee_ID": (payload.employee_id or generate_employee_id()).strip(),
        "Name": payload.name.strip(),
        "Department": payload.department.strip(),
        "Position": payload.position.strip(),
        "CreatedAt": now,
        "UpdatedAt": now,
    }

    if payload.email:
        document["Email"] = payload.email
    if payload.phone:
        document["Phone"] = payload.phone.strip()
    if payload.date_of_joining:
        document["DateOfJoining"] = payload.date_of_joining
    if payload.employment_type:
        document["EmploymentType"] = payload.employment_type.strip()
    if payload.manager:
        document["Manager"] = payload.manager.strip()

    return document


async def ensure_unique_employee(collection, document: Dict[str, Any]) -> None:
    existing = await collection.find_one({"Employee_ID": document["Employee_ID"]})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee with this identifier already exists",
        )
    if document.get("Email"):
        existing_email = await collection.find_one({"Email": document["Email"]})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee with this email already exists",
            )


@router.get("/employees")
async def get_employees(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all employees with optional filtering"""
    db = get_database()
    collection = db["employee"]
    
    # Build query
    query = {}
    if search:
        query["$or"] = [
            {"Name": {"$regex": search, "$options": "i"}},
            {"Employee_ID": {"$regex": search, "$options": "i"}},
            {"Department": {"$regex": search, "$options": "i"}}
        ]
    if department:
        query["Department"] = department
    
    # Pagination
    skip = (page - 1) * limit
    
    # Fetch data
    cursor = collection.find(query).skip(skip).limit(limit)
    employees = await cursor.to_list(length=limit)
    total = await collection.count_documents(query)
    
    # Serialize
    for emp in employees:
        serialize_document(emp)
    
    return {
        "success": True,
        "data": employees,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


@router.get("/employees/roles")
async def list_employee_roles(department: Optional[str] = Query(None, description="Filter roles by department")):
    """List unique employee roles (positions) with optional department filter."""
    db = get_database()
    collection = db["employee"]

    pipeline: List[Dict[str, Any]] = [
        {
            "$project": {
                "role": {
                    "$ifNull": [
                        "$Role",
                        {
                            "$ifNull": ["$role", "$Position"]
                        },
                    ]
                },
                "department": {
                    "$ifNull": ["$Department", "N/A"]
                },
            }
        },
        {
            "$match": {
                "role": {"$ne": None, "$ne": ""},
            }
        },
    ]

    if department:
        pipeline.append(
            {
                "$match": {
                    "department": department
                }
            }
        )

    pipeline.extend(
        [
            {
                "$group": {
                    "_id": {
                        "role": "$role",
                        "department": "$department"
                    },
                    "role": {"$first": "$role"},
                    "department": {"$first": "$department"},
                    "count": {"$sum": 1},
                }
            },
            {
                "$sort": {
                    "role": 1,
                    "department": 1,
                }
            },
        ]
    )

    cursor = collection.aggregate(pipeline, allowDiskUse=True)
    results = await cursor.to_list(length=1000)

    role_list = [
        {
            "role": entry.get("role", "").strip(),
            "department": entry.get("department", "N/A") or "N/A",
            "count": entry.get("count", 0),
        }
        for entry in results
        if entry.get("role")
    ]

    return {
        "success": True,
        "data": role_list,
        "count": len(role_list),
    }


@router.get("/employees/{employee_id}")
async def get_employee(employee_id: str):
    """Get single employee by ID, supporting multiple identifier formats"""
    db = get_database()
    collection = db["employee"]

    if not employee_id:
        raise HTTPException(status_code=400, detail="Employee ID is required")

    lookup_id = employee_id.strip()
    employee = None

    # Primary lookup keys
    for key in ["Employee_ID", "EmployeeID", "employee_id", "ID", "id"]:
        employee = await collection.find_one({key: lookup_id})
        if employee:
            break

    # Fallback to MongoDB ObjectId
    if not employee:
        try:
            object_id = ObjectId(lookup_id)
            employee = await collection.find_one({"_id": object_id})
        except Exception:
            employee = None

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    serialize_document(employee)
    return {"success": True, "data": employee}


@router.post("/employees", status_code=status.HTTP_201_CREATED)
async def create_employee(employee: EmployeeCreate):
    """Create a new employee record"""
    db = get_database()
    collection = db["employee"]

    document = map_employee_to_document(employee)
    await ensure_unique_employee(collection, document)

    inserted = await collection.insert_one(document)
    created = await collection.find_one({"_id": inserted.inserted_id})

    if not created:
        raise HTTPException(status_code=500, detail="Failed to create employee record")

    serialize_document(created)
    return {"success": True, "data": created}

@router.get("/employees/{employee_id}/attrition-risk")
async def get_employee_attrition_risk(employee_id: str):
    """Get attrition risk for specific employee"""
    from app.services.ml_service import predict_attrition_for_employee
    
    try:
        prediction = await predict_attrition_for_employee(employee_id)
        return {"success": True, "data": prediction}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/employees/{employee_id}/performance-prediction")
async def get_employee_performance_prediction(employee_id: str, periods: int = Query(6, ge=1, le=12)):
    """Get performance prediction for specific employee using ARIMA model"""
    from app.services.ml_service import predict_performance_for_employee
    
    try:
        prediction = await predict_performance_for_employee(employee_id, periods=periods)
        return {"success": True, "data": prediction}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

