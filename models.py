from tokenize import Double
import db
from sqlalchemy import Column, String, DateTime, SmallInteger, Date, func, Integer, ForeignKey, Boolean, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base


TableBase = declarative_base()


class User(TableBase):
    __tablename__ = 'users'

    email = Column(String(320), primary_key=True)
    password = Column(String(32), nullable=False)
    joining_date = Column(DateTime, server_default=func.now(), nullable=False)
    role = Column(SmallInteger, default=0, nullable=False, index=True)
    first_name = Column(String(120), nullable=False)
    surname = Column(String(120), nullable=False)
    birth_date = Column(Date)
    bio = Column(String(1000))
    # slides = relationship("Slide", back_populates="users", cascade="all, delete", passive_deletes=True)

    def __str__(self):
        return f'User: {self.first_name}, email: {self.email}'


class Slide(TableBase):
    __tablename__ = 'slides'

    id = Column(Integer, primary_key=True)
    user_id = Column(String(320), ForeignKey('users.email', ondelete='CASCADE', onupdate='CASCADE'),
                     nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now(), nullable=False)
    scan_date = Column(Date, nullable=True)
    species = Column(String(320), nullable=False)
    status = Column(Boolean, server_default=func.bool(False), nullable=False)
    approved_by = Column(String(320), ForeignKey('users.email', onupdate='CASCADE'))
    approved_at = Column(DateTime)

class Img(TableBase):
    __tablename__ = 'imgs'

    id = Column(Integer, primary_key=True)
    name=Column(String, unique=True, nullable=False) #nome da imagem
    imgs_pff=Column(String, unique=True, nullable=False) # caminho da imagem .pff
    imgs_min=Column(String, unique=True, nullable=False) # caminho da imagem .jpg(miniatura)

class Info(TableBase):
    __tablename__='info'

    id = Column(Integer, primary_key=True)
    imgs_id = Column(Integer, ForeignKey('imgs.id'))

    nome_da_lamina = Column(String, unique=True, nullable=False)
    tecido = Column(String, nullable=False)
    coloracao = Column(String, nullable=False)
    tamanho_da_imagem = Column(String, nullable=False)
    tamanho_pixel = Column(String, nullable=False) #tamanho do pixel 
    resolução = Column(String, nullable=False)
    magnificação = Column(String, nullable=False) #até quanto vai o zoom
    fonte = Column(String, nullable=False)


TableBase.metadata.create_all(db.engine)
