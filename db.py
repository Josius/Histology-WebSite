from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('postgresql+psycopg2://histadmin:histadmin@localhost:5432/histdb')
DBSession = sessionmaker()
DBSession.configure(bind=engine)
db_session = DBSession()
