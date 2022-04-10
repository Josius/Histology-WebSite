from __future__ import annotations
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
import datetime
import forms
import os
import json
import requests



backend = Flask(__name__)


current_year = str(datetime.date.today())[0:4]

parser = ConfigParser()
parser.read('conf.cfg')
current_version = parser.get('version', 'current_version')
backend.config['SECRET_KEY'] = parser.get('flask parameters', 'secret_key')
backend.config['DEBUG MODE'] = parser.get('flask parameters', 'debug_mode')
backend.config['UPLOAD_PATH'] = './slides'


@backend.route('/')
def index():
    return render_template('home.html', page_name='Home', current_year=current_year,
                           version=current_version)


# BROWSE ORIGINAL
""" 
@backend.route('/browse')
def browse():
    return render_template('browse.html', page_name='Navegar', current_year=current_year,
                           version=current_version)
 """

 
# 02 vvv
@backend.route('/browse', methods=['GET', 'POST'])
def browse():
# 05 - com request nao deu certo
    # imgPath = request.form['text']
    # xmlPath = request.form['xmlPath']
    # imgName = request.form['imgName']
    # htmPath = request.form['htmPath']
    # print(imgPath)
    # print(xmlPath)
    # print(imgName)
    # print(htmPath)
    
    form_img = forms.ImageForm()
    # if request.method == 'POST':
    #     imgUrl = form_img.img_path.data
    #     xmlUrl = form_img.xml_path.data
    #     imgNome = form_img.img_name.data
    #     htmlUrl = open(form_img.htm_path.data, 'r')
    #     arqHtml = htmlUrl.read()
    #     htmlUrl.close()
        
        
    #     print(form_img.img_path.data)
    #     print(form_img.xml_path.data)
    #     print(form_img.img_name.data)
    #     print(form_img.htm_path.data)
        

    #     return viewport(imgUrl, xmlUrl, arqHtml, imgNome) 
# 05

# 04, eu acho
    # dados_json = '{"imgUrl" : "imgsPff/L01PeleGrossaCoximdeGatoL2HE40X.pff", "xmlUrl" : "xml/L01PeleGrossaCoximdeGatoL2HE40X-annotations.xml", "imgNome": "Pele Grossa"}'

    # if request.method == 'POST':
    #     if request.form.get('action1') == 'VALUE1':
    #         dados = json.loads(dados_json)

    #         imgUrl = dados["imgUrl"]
    #         xmlUrl = dados["xmlUrl"]
    #         imgNome = dados["imgNome"]
    #         htmlUrl = open(
    #             'static/html/L01PeleGrossaCoximdeGatoL2HE40.htm', 'r')
    #         arqHtml = htmlUrl.read()
    #         htmlUrl.close()

    #         # imgUrl = 'imgsPff/L01PeleGrossaCoximdeGatoL2HE40X.pff'
    #         # xmlUrl = 'xml/L01PeleGrossaCoximdeGatoL2HE40X-annotations.xml'
    #         # htmlUrl = open(
    #         #     'static/html/L01PeleGrossaCoximdeGatoL2HE40.htm', 'r')
    #         # imgNome = 'Pele Grossa'
    #         # arqHtml = htmlUrl.read()
    #         # htmlUrl.close()

    #         return viewport(imgUrl, xmlUrl, arqHtml, imgNome)
    #     elif request.form.get('action2') == 'VALUE2':
    #         imgUrl = 'imgsPff/L60PelefinaHE40XB.pff'
    #         xmlUrl = 'xml/L60PelefinaHE40XB-annotations.xml'
    #         htmlUrl = open('static/html/L60PeleFina.htm', 'r')
    #         imgNome = 'L60- Pele fina'
    #         arqHtml = htmlUrl.read()
    #         htmlUrl.close()

    #         return viewport(imgUrl, xmlUrl, arqHtml, imgNome)

    return render_template('browse.html', page_name='Navegar', current_year=current_year,
                           version=current_version, form_img=form_img)

# 05
@backend.route('/teste05', methods=['GET', 'POST'])
def teste05():
    form_img = forms.ImageForm()
    if request.method == 'POST':
        imgUrl = form_img.img_path.data
        xmlUrl = form_img.xml_path.data
        imgNome = form_img.img_name.data
        htmlUrl = open(form_img.htm_path.data, 'r')
        arqHtml = htmlUrl.read()
        htmlUrl.close()
        
        
        print(form_img.img_path.data)
        print(form_img.xml_path.data)
        print(form_img.img_name.data)
        print(form_img.htm_path.data)
    image = imgUrl
    xml = xmlUrl
    html = arqHtml
    nmImg = imgNome
    return render_template(
        'view.html',
        current_year=current_year, current_version=current_version, imageFile=image, xmlFile=xml, htmlFile=html, nomeImagem=nmImg
    )
# 05


@backend.route('/viewport')
def viewport(imgUrl, xmlUrl, arqHtml, imgNome):
    image = imgUrl
    xml = xmlUrl
    html = arqHtml
    nmImg = imgNome
    return render_template(
        'view.html',
        current_year=current_year, current_version=current_version, imageFile=image, xmlFile=xml, htmlFile=html, nomeImagem=nmImg
    )
# 02 ^^^

# API
def inserirDados(imgPath, xmlPath, imgName, htmPath):
    return {"imgPath":imgPath, "xmlPath":xmlPath, "imgName":imgName, "htmPath":htmPath}

@backend.route("/selecionaImagem", methods=["POST"])
def selecionaImg():

    body = request.get_json()
    print("Entrou")

    if("imgPath" not in body):
        return geraResponse(400, "O parâmetro é imgPath obrigatório")
    if("xmlPath" not in body):
        return geraResponse(400, "O parâmetro é xmlPath obrigatório")
    if("imgName" not in body):
        return geraResponse(400, "O parâmetro é imgName obrigatório")
    if("htmPath" not in body):
        return geraResponse(400, "O parâmetro é htmPath obrigatório")
    print(body)
    dados = inserirDados(
                        body["imgPath"],
                        body["xmlPath"],
                        body["imgName"],
                        body["htmPath"]
                        )
    
    print(dados)

    return geraResponse(200, "Dados enviados", "dados", dados)

def geraResponse(status, mensagem, nomeDoConteudo=False, conteudo=False):
    response = {}
    response["status"] = status
    response["mensagem"] = mensagem

    if(nomeDoConteudo and conteudo):
        response[nomeDoConteudo] = conteudo

    return response
# API
#  com funcao js
@backend.route('/viewportTeste00', methods=['GET', 'POST'])
def viewportTeste():
    
    # dados_json = request.get_json()
    # dados = jsonify(request.form).json

    dados_json = '{"imgUrl" : "imgsPff/L01PeleGrossaCoximdeGatoL2HE40X.pff", "xmlUrl" : "xml/L01PeleGrossaCoximdeGatoL2HE40X-annotations.xml", "imgNome": "Pele Grossa", "htmlUrl":"static/html/L01PeleGrossaCoximdeGatoL2HE40.htm"}'
    # print(dados_json)
    dados = json.loads(dados_json)
    # # print(dados.dumps())
    

    image = dados["imgUrl"]
    xml = dados["xmlUrl"]
    nmImg = dados["imgNome"]
    arqHtml = open(dados["htmlUrl"], 'r')
    html = arqHtml.read()
    arqHtml.close()

    return render_template(
        'view.html',
        current_year=current_year, current_version=current_version, imageFile=image, xmlFile=xml, htmlFile=html, nomeImagem=nmImg
    )

# 00 com ajax
""" @backend.route('/viewportTeste', methods=['GET', 'POST'])
def viewportTeste():  

    image = request.form['imgUrl']
    xml = request.form["xmlUrl"]
    nmImg = request.form["imgNome"]
    arqHtml = open(request.form["htmlUrl"], 'r')
    html = arqHtml.read()
    arqHtml.close()

    print(image)
    print(type(image))
    return render_template(
        'view.html',
        current_year=current_year, current_version=current_version, imageFile=image, xmlFile=xml, htmlFile=html, nomeImagem=nmImg
    )
 """
    


# 00
# 01 vvv
""" 
@backend.route('/browse', methods=['GET', 'POST'])
def browse():
    imgForm = forms.ImageForm()
    if imgForm.validate_on_submit():
        print(type(imgForm.imgUrl.data))
        print(imgForm.imgUrl.data)
        return viewport(imgForm)
    return render_template('browse.html', page_name='Navegar', current_year=current_year,
                           version=current_version, imgForm = imgForm)
                           

@backend.route('/viewport')
def viewport(imgForm):
    image = imgForm.imgUrl
    return render_template('view.html', current_year=current_year, current_version=current_version, imageFile=image)    
"""
# 01 ^^^


# VIEWPORT ORIGINAL
""" 
@backend.route('/viewport')
def viewport():
    # image = request.form.get('zImagePath')
    return render_template('view.html', current_year=current_year, current_version=current_version, imageFile='imgsPff/L60PelefinaHE40XB.pff')
 """


@backend.route('/contribute', methods=['GET', 'POST'])
def contribute():
    page_name = 'Contribua'
    try:
        if session['user_email']:
            return redirect(url_for('dashboard'))

    except KeyError:
        pass

    login_form = forms.LoginForm()
    sign_up_form = forms.SignUpForm()

    return render_template('contribute.html', page_name=page_name, current_year=current_year,
                           version=current_version, login_form=login_form, sign_up_form=sign_up_form)


@backend.route('/signup', methods=['GET', 'POST'])
def signup():
    sign_up_form = forms.SignUpForm()

    if sign_up_form.validate():
        if None in (sign_up_form.email.data, sign_up_form.name.data, sign_up_form.password.data,
                    sign_up_form.surname.data, sign_up_form.password2):
            return 'Por favor preencha todos os campos do formulário de cadastro'
        else:
            if sign_up_form.password.data != sign_up_form.password2.data:
                return 'as senhas não são iguais'
            elif len(sign_up_form.password.data) < 6:
                return 'a senha precisa de pelo menos 6 caracteres'
            session['user_email'] = sign_up_form.email.data
            new_user = models.User(email=sign_up_form.email.data,
                                   first_name=sign_up_form.name.data,
                                   surname=sign_up_form.surname.data,
                                   password=sign_up_form.password.data)
            db_session.add(new_user)
            db_session.commit()
            return redirect(url_for('dashboard'))
    else:
        return 'Por favor preencha todos os campos do formulário de cadastro'


@backend.route('/login', methods=['GET', 'POST'])
def login():
    login_form = forms.LoginForm()

    if None in (login_form.email.data, login_form.password.data):
        if login_form.email.data is None:
            return 'Preencha o email'
        if login_form.password.data is None:
            return 'Preencha a senha'
    else:
        try:
            user = db_session.query(models.User).get(login_form.email.data)
            if user.password == login_form.password.data:
                session['user_email'] = user.email
                return redirect(url_for('dashboard'))
        except AttributeError:
            return 'Email não cadastrado'
    return 'Senha incorreta'


@backend.route('/dashboard', methods=['GET', 'POST'], defaults={'edit_mode': False})
def dashboard(edit_mode):
    page_name = 'Dashboard'
    if request.form.get('logoff') == 'Logoff':
        session['user_email'] = None
    try:
        if session['user_email'] is None:
            return redirect(url_for('contribute'))
        else:
            user = db_session.query(models.User).get(session['user_email'])
            add_slide_form = forms.AddSlideForm()
            if request.form.get('edit_user_data') == 'Editar Informações':
                edit_mode = True
            if request.form.get('update') == 'Atualizar':
                user.first_name = request.form.get('first_name')
                user.surname = request.form.get('surname')
                user.birth_date = request.form.get('birth_date')
                user.bio = request.form.get('bio')
                db_session.commit()
                user = db_session.query(models.User).get(session['user_email'])
            if request.form.get('add_slide') == 'Adicionar':
                render_add_form = True
            else:
                render_add_form = False
            if request.form.get('add_slide') == 'Enviar':
                if add_slide_form.validate_on_submit():
                    add_slide_form = forms.AddSlideForm()
                    render_add_form = False
                    new_slide = models.Slide(user_id=user.email, species=add_slide_form.species.data,
                                             scan_date=add_slide_form.scan_date.data)
                    db_session.add(new_slide)
                    db_session.commit()
                    if not os.path.exists(f'./slides/{new_slide.id}'):
                        os.mkdir(f'./slides/{new_slide.id}')
                    file = add_slide_form.image_file.data
                    print(file.__dict__)
                    file.save(os.path.join(
                        f'./slides/{new_slide.id}', secure_filename('a')))
                    json_file = {'lang': 'pt-br',
                                 'slide_title': add_slide_form.name.data}
                    with open(f'./slides/{new_slide.id}/meta.json', 'w') as outfile:
                        json.dump(json_file, outfile)
                else:
                    return add_slide_form.errors

            slides = db_session.query(models.Slide).\
                filter(models.Slide.user_id == session['user_email']).order_by(
                    models.Slide.uploaded_at).all()
            slides_dict = {}
            for slide in slides:
                with open(f'./slides/{slide.id}/meta.json') as meta:
                    slides_dict[slide.id] = {
                        'object': slide, 'meta': json.load(meta)}

            return render_template('dashboard.html', page_name=page_name, current_year=current_year,
                                   version=current_version, user=user, display_constructor=forms.UserData,
                                   edit_mode=edit_mode, add_slide_form=add_slide_form, slides=slides_dict,
                                   request=request, render_add_form=render_add_form, json=json)
    except KeyError:
        return redirect(url_for('contribute'))

# with open('./static/L01PeleGrossaCoximdeGatoL2HE40X.htm') as htmlFile:
#     htmlString = htmlFile.read()

#     @backend.route('/browse')
#     def browse():
#         return render_template('browse.html', page_name='Navegar', current_year=current_year,
#                             version=current_version, imageFile='testeJosimarDois.zif', htmlFile=htmlString, annotationsFile='Assets/Annotations/Narratives/testeJosimarDois-annotations.xml')


# 01 - CÓDIGO ABAIXO NÃO FUNCIONA
""" 
@backend.route('/viewport', methods=['POST'])
def viewport():
    image = request.form.get('zImagePath')
    return render_template('view.html', current_year=current_year, current_version=current_version, imageFile=image)
 """

# 00 - CÓDIGO ABAIXO FUNCIONA
""" 
@backend.route('/viewport')
def viewport():
    image = request.form.get('zImagePath')
    return render_template('view.html', current_year=current_year, current_version=current_version, imageFile='imgsPff/L60PelefinaHE40XB.pff')
"""


""" @backend.route('/viewport')
def viewport():
    return render_template('view.html', current_year=current_year, current_version=current_version,
                           slide_meta=json.load(open('./slides/10/meta.json'))) """


@backend.route('/help')
def help_me():
    help_form = forms.HelpForm()
    page_name = 'Ajuda'
    return render_template('help.html', page_name=page_name, current_year=current_year,
                           version=current_version, help_form=help_form)


if __name__ == '__main__':
    backend.run(debug=True)

# if __name__ == '__main__':
#     from waitress import serve
#     serve(backend, host="127.0.0.1", port=8080)


def create_app():
    import db
    app = Flask(__name__)
    db = db.db
    db.init_app(app)
    return app
