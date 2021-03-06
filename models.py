import db
from sqlalchemy import Column, String, DateTime, SmallInteger, Date, func
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()


class User(Base):
    __tablename__ = 'users'

    email = Column(String(320), primary_key=True)
    password = Column(String(32), nullable=False)
    joining_date = Column(DateTime, server_default=func.now(), nullable=False)
    role = Column(SmallInteger, default=0, nullable=False)
    first_name = Column(String(120), nullable=False)
    surname = Column(String(120), nullable=False)
    birth_date = Column(Date)
    bio = Column(String(1000))

    def __str__(self):
        return f'User: {self.first_name}, email: {self.email}'


Base.metadata.create_all(db.engine)
