from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class InquiryCreate(BaseModel):
    name: str
    institution: str
    phone: str
    email: EmailStr
    city: str
    message: Optional[str] = None

class Inquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    institution: str
    phone: str
    email: str
    city: str
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"  # pending, contacted, completed

class NewsletterCreate(BaseModel):
    email: EmailStr

class Newsletter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    subscribed: bool = True

class Stats(BaseModel):
    students_reached: int
    schools_partnered: int
    trips_conducted: int
    cities_covered: int


# Root route
@api_router.get("/")
async def root():
    return {"message": "EduTrip API - Learning Beyond Classrooms"}

# Inquiry endpoints
@api_router.post("/inquiries", response_model=Inquiry)
async def create_inquiry(inquiry: InquiryCreate):
    """Submit a new inquiry from institution"""
    inquiry_obj = Inquiry(**inquiry.model_dump())
    
    # Convert to dict and serialize datetime
    doc = inquiry_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.inquiries.insert_one(doc)
    return inquiry_obj

@api_router.get("/inquiries", response_model=List[Inquiry])
async def get_inquiries(status: Optional[str] = None):
    """Get all inquiries (admin endpoint)"""
    query = {} if not status else {"status": status}
    inquiries = await db.inquiries.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    # Convert ISO string timestamps back to datetime
    for inquiry in inquiries:
        if isinstance(inquiry['timestamp'], str):
            inquiry['timestamp'] = datetime.fromisoformat(inquiry['timestamp'])
    
    return inquiries

@api_router.patch("/inquiries/{inquiry_id}/status")
async def update_inquiry_status(inquiry_id: str, status: str):
    """Update inquiry status"""
    result = await db.inquiries.update_one(
        {"id": inquiry_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    return {"message": "Status updated successfully"}

# Newsletter endpoints
@api_router.post("/newsletter", response_model=Newsletter)
async def subscribe_newsletter(newsletter: NewsletterCreate):
    """Subscribe to newsletter"""
    # Check if already subscribed
    existing = await db.newsletter.find_one({"email": newsletter.email})
    if existing:
        return Newsletter(**{**existing, "timestamp": datetime.fromisoformat(existing['timestamp'])})
    
    newsletter_obj = Newsletter(**newsletter.model_dump())
    
    # Convert to dict and serialize datetime
    doc = newsletter_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.newsletter.insert_one(doc)
    return newsletter_obj

@api_router.get("/newsletter", response_model=List[Newsletter])
async def get_newsletter_subscribers():
    """Get all newsletter subscribers (admin endpoint)"""
    subscribers = await db.newsletter.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    # Convert ISO string timestamps back to datetime
    for sub in subscribers:
        if isinstance(sub['timestamp'], str):
            sub['timestamp'] = datetime.fromisoformat(sub['timestamp'])
    
    return subscribers

# Stats endpoint
@api_router.get("/stats", response_model=Stats)
async def get_stats():
    """Get platform statistics"""
    # These would be calculated from actual data in production
    # For now, returning impressive numbers
    return Stats(
        students_reached=15000,
        schools_partnered=150,
        trips_conducted=500,
        cities_covered=25
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
