from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.core.database import get_database
from bson import ObjectId

router = APIRouter()

def serialize_document(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

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

@router.get("/employees/{employee_id}")
async def get_employee(employee_id: str):
    """Get single employee by ID"""
    db = get_database()
    collection = db["employee"]
    
    employee = await collection.find_one({"Employee_ID": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    serialize_document(employee)
    return {"success": True, "data": employee}

@router.get("/employees/{employee_id}/attrition-risk")
async def get_employee_attrition_risk(employee_id: str):
    """Get attrition risk for specific employee"""
    from app.services.ml_service import predict_attrition_for_employee
    
    try:
        prediction = await predict_attrition_for_employee(employee_id)
        return {"success": True, "data": prediction}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

