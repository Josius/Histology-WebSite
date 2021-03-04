from sqlalchemy import create_engine, Column, String, Binary, DateTime, Date, SmallInteger
from sqlalchemy.ext.declarative import declarative_base

engine = create_engine('postgresql+psycopg2://histadmin:histadmin@localhost:5432/public.histdb')
