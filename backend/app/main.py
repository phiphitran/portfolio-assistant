from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.portfolio import router as portfolio_router

app = FastAPI(
    title="Portfolioassistenten",
    description="AI-powered portfolio analysis, risk radar, and what-if simulation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio_router)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
