from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
engine = create_engine('postgresql+psycopg2://postgres:postgres@localhost:5432/histdb')

DBSession = sessionmaker()
DBSession.configure(bind=engine)
db_session = DBSession()
