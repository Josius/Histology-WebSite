from __future__ import annotations
from ensurepip import version
from crypt import methods  # comentar esta linha para funcionar no windows
import html
import re
from tkinter import Image
from traceback import print_tb
from turtle import back
from urllib import response
from flask import Flask, render_template, session, redirect, url_for, request
from configparser import ConfigParser
from db import db_session
from werkzeug.utils import secure_filename
import models
from models import Img, Info
import datetime
import forms
from forms import SearchForm
import os
import json
import requests
from sqlalchemy import func

backend = Flask(__name__)


current_year = str(datetime.date.today())[0:4]

parser = ConfigParser()
parser.read('conf.cfg')
current_version = parser.get('version', 'current_version')
backend.config['SECRET_KEY'] = parser.get('flask parameters', 'secret_key')
backend.config['DEBUG MODE'] = parser.get('flask parameters', 'debug_mode')
backend.config['UPLOAD_PATH'] = './slides'


@backend.route('/')
def home():
    return render_template('home.html', page_name='Home', current_year=current_year,
                           version=current_version)


@backend.route('/chapters', methods=['GET', 'POST'])
def chapters():

        return render_template('chapters.html', page_name='Capitulos',current_year=current_year,
                                current_version=current_version)


@backend.route('/browse', methods=['GET', 'POST'])
def browse():

    arq_nome = forms.ArqImgForm()

    searched = request.args.get('searched')
    filtro = request.args.get('filtro')
    tableName = None

    if searched:

        searched = searched.lower()

        imgs = db_session.query(models.Img)
        info = db_session.query(models.Info)

        if filtro == 'name' or filtro == 'none':
            tableName = 'Img'
            imgs = db_session.query(models.Img).filter(Img.name.ilike(r"%{}%".format(searched)))

        if filtro == 'nome_da_lamina':
            tableName = 'Info'
            imgs = db_session.query(models.Info).filter(Info.nome_da_lamina.ilike(r"%{}%".format(searched)))

        if filtro == 'tecido':
            tableName = 'Info'
            imgs = db_session.query(models.Info).filter(Info.tecido.ilike(r"%{}%".format(searched)))

        if filtro == 'coloracao':
            tableName = 'Info'
            imgs = db_session.query(models.Info).filter(Info.coloracao.ilike(r"%{}%".format(searched)))

        if filtro == 'fonte':
            tableName = 'Info'
            imgs = db_session.query(models.Info).filter(Info.fonte.ilike(r"%{}%".format(searched)))
    else:
        tableName = 'Img'
        imgs = db_session.query(models.Img)

    if(tableName == 'Info'):
        list = []
        for y in imgs:
            list += [y.imgs_id]
        print(list)
        imgs = db_session.query(models.Img).filter(Img.id.in_(list))

    quant = 0
    for x in imgs:
        quant += 1

    if quant > 0:
        quant = 'Encontradas: %s' % (quant)
    else:
        quant = "Nenhuma Encontrada"

    if filtro == 'name': filtro = 'Nome'
    if filtro == 'nome_da_lamina': filtro = 'Nome da Lamina'
    if filtro == 'tecido': filtro = 'Tecido'
    if filtro == 'coloracao': filtro = 'Coloração'
    if filtro == 'fonte': filtro = 'Fonte'

    return render_template('browse.html', page_name='Navegar', current_year=current_year,
                           version=current_version, nome_arq=arq_nome, imgs=imgs,
                           searched=searched, quant=quant, filtro=filtro,tableName = tableName)


@backend.route('/viewport/<int:img_id>', methods=['GET', 'POST'])
def viewport(img_id):

    arq_path = forms.ArqImgForm()
    

    info = db_session.query(models.Info).filter_by(imgs_id=img_id).first()

    if request.method == 'POST':
        dados = []
        local_dados_lamina = 'static/dadosLmns/' + arq_path.arq_nome.data

        f = open(local_dados_lamina, 'r')
        for linha in f:
            dados.append(linha.split())
        f.close()

        htmlUrl = open(str(dados[3]).strip('[]').replace("'", ""), 'r')
        arqHtml = htmlUrl.read()
        htmlUrl.close()

        image = str(dados[0]).strip('[]').replace("'", "")
        xml = str(dados[1]).strip('[]').replace("'", "")
        nmImg = str(dados[2]).strip('[]').replace("'", "").replace(",", "")
        html = arqHtml

    return render_template(
        'view.html',
        current_year=current_year, current_version=current_version,
        imageFile=image, xmlFile=xml, htmlFile=html, nomeImagem=nmImg, info = info)


@ backend.route('/index/<string:id>', methods=['GET', 'POST'])
def index(id):

    arq_nome = forms.ArqImgForm()
    imgs = db_session.query(models.Img)
    list = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
            'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

    return render_template('index.html', page_name='Indice-%s' % (id), current_year=current_year,
                           version=current_version, nome_arq=arq_nome, imgs=imgs, id=id, list=list)

# @ backend.route('/contribute', methods = ['GET', 'POST'])
# def contribute():
#     page_name='Contribua'
#     try:
#         if session['user_email']:
#             return redirect(url_for('dashboard'))

#     except KeyError:
#         pass

#     login_form=forms.LoginForm()
#     sign_up_form=forms.SignUpForm()

#     return render_template('contribute.html', page_name = page_name, current_year = current_year,
#                            version = current_version, login_form = login_form, sign_up_form = sign_up_form)


# @ backend.route('/signup', methods = ['GET', 'POST'])
# def signup():
#     sign_up_form=forms.SignUpForm()

#     if sign_up_form.validate():
#         if None in (sign_up_form.email.data, sign_up_form.name.data, sign_up_form.password.data,
#                     sign_up_form.surname.data, sign_up_form.password2):
#             return 'Por favor preencha todos os campos do formulário de cadastro'
#         else:
#             if sign_up_form.password.data != sign_up_form.password2.data:
#                 return 'as senhas não são iguais'
#             elif len(sign_up_form.password.data) < 6:
#                 return 'a senha precisa de pelo menos 6 caracteres'
#             session['user_email'] = sign_up_form.email.data
#             new_user = models.User(email=sign_up_form.email.data,
#                                    first_name=sign_up_form.name.data,
#                                    surname=sign_up_form.surname.data,
#                                    password=sign_up_form.password.data)
#             db_session.add(new_user)
#             db_session.commit()
#             return redirect(url_for('dashboard'))
#     else:
#         return 'Por favor preencha todos os campos do formulário de cadastro'


# @backend.route('/login', methods=['GET', 'POST'])
# def login():
#     login_form = forms.LoginForm()

#     if None in (login_form.email.data, login_form.password.data):
#         if login_form.email.data is None:
#             return 'Preencha o email'
#         if login_form.password.data is None:
#             return 'Preencha a senha'
#     else:
#         try:
#             user = db_session.query(models.User).get(login_form.email.data)
#             if user.password == login_form.password.data:
#                 session['user_email'] = user.email
#                 return redirect(url_for('dashboard'))
#         except AttributeError:
#             return 'Email não cadastrado'
#     return 'Senha incorreta'


# @backend.route('/dashboard', methods=['GET', 'POST'], defaults={'edit_mode': False})
# def dashboard(edit_mode):
#     page_name = 'Dashboard'
#     if request.form.get('logoff') == 'Logoff':
#         session['user_email'] = None
#     try:
#         if session['user_email'] is None:
#             return redirect(url_for('contribute'))
#         else:
#             user = db_session.query(models.User).get(session['user_email'])
#             add_slide_form = forms.AddSlideForm()
#             if request.form.get('edit_user_data') == 'Editar Informações':
#                 edit_mode = True
#             if request.form.get('update') == 'Atualizar':
#                 user.first_name = request.form.get('first_name')
#                 user.surname = request.form.get('surname')
#                 user.birth_date = request.form.get('birth_date')
#                 user.bio = request.form.get('bio')
#                 db_session.commit()
#                 user = db_session.query(models.User).get(session['user_email'])
#             if request.form.get('add_slide') == 'Adicionar':
#                 render_add_form = True
#             else:
#                 render_add_form = False
#             if request.form.get('add_slide') == 'Enviar':
#                 if add_slide_form.validate_on_submit():
#                     add_slide_form = forms.AddSlideForm()
#                     render_add_form = False
#                     new_slide = models.Slide(user_id=user.email, species=add_slide_form.species.data,
#                                              scan_date=add_slide_form.scan_date.data)
#                     db_session.add(new_slide)
#                     db_session.commit()
#                     if not os.path.exists(f'./slides/{new_slide.id}'):
#                         os.mkdir(f'./slides/{new_slide.id}')
#                     file = add_slide_form.image_file.data
#                     print(file.__dict__)
#                     file.save(os.path.join(
#                         f'./slides/{new_slide.id}', secure_filename('a')))
#                     json_file = {'lang': 'pt-br',
#                                  'slide_title': add_slide_form.name.data}
#                     with open(f'./slides/{new_slide.id}/meta.json', 'w') as outfile:
#                         json.dump(json_file, outfile)
#                 else:
#                     return add_slide_form.errors

#             slides = db_session.query(models.Slide).\
#                 filter(models.Slide.user_id == session['user_email']).order_by(
#                     models.Slide.uploaded_at).all()
#             slides_dict = {}
#             for slide in slides:
#                 with open(f'./slides/{slide.id}/meta.json') as meta:
#                     slides_dict[slide.id] = {
#                         'object': slide, 'meta': json.load(meta)}

#             return render_template('dashboard.html', page_name=page_name, current_year=current_year,
#                                    version=current_version, user=user, display_constructor=forms.UserData,
#                                    edit_mode=edit_mode, add_slide_form=add_slide_form, slides=slides_dict,
#                                    request=request, render_add_form=render_add_form, json=json)
#     except KeyError:
#         return redirect(url_for('contribute'))


@backend.route('/help')
def help_me():
    help_form = forms.HelpForm()
    page_name = 'Ajuda'
    return render_template('help.html', page_name=page_name, current_year=current_year,
                           version=current_version, help_form=help_form)

@backend.route('/about')
def about():
    page_name = 'Sobre'
    return render_template('sobre.html', page_name=page_name, current_year=current_year,
                           version=current_version)


if __name__ == '__main__':
    backend.run(debug=True)


def create_app():
    import db
    app = Flask(__name__)
    db = db.db
    db.init_app(app)
    return app
