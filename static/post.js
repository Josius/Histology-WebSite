function dadosParaServ(url, body) {
    // console.log("Body=", typeof(JSON.stringify(Object.keys(body))));
    console.log(url);
    let request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.setRequestHeader("Content-type", "application/json; charset=UTF-8");
    request.send(JSON.stringify(body));
    
    // request.onload = function () {
    //     console.log(this.responseText);
    // }

    // return request.responseText;
    // alert(body);
}

function enviarDados() {
    let url = "http://127.0.0.1:5000/viewportTeste00";
    // let url = '/viewportTeste00';
    let imgUrl = document.getElementById("imgPath").value;
    let xmlUrl = document.getElementById("xmlPath").value; 
    let imgNome = document.getElementById("imgName").value;
    let htmlUrl = document.getElementById("htmPath").value;
    console.log(typeof(imgUrl));
    console.log(xmlUrl);
    console.log(imgNome);
    console.log(htmlUrl);

    const body = {imgUrl : imgUrl, xmlUrl : xmlUrl, imgNome: imgNome, htmlUrl: htmlUrl}
    console.log(JSON.stringify(body));
    dadosParaServ(url, body);
}

function enviarDadosDois() {
    let imgUrl = document.getElementById("imgPath").value;
    let xmlUrl = document.getElementById("xmlPath").value; 
    let imgNome = document.getElementById("imgName").value;
    let htmlUrl = document.getElementById("htmPath").value;

    fetch('/viewportTeste00', {
        headers : {
            'Content-Type' : 'application/json'
        },
        method : 'POST',
        body : JSON.stringify({
            'imgUrl' : imgUrl,
            'xmlUrl' : xmlUrl,
            'imgNome': imgNome,
            'htmlUrl': htmlUrl

        })
    })
    .then(function (response){

        if(response.ok) {
            response.json()
            .then(function(response) {
                console.log(response);
            });
        }
        else {
            throw Error('Something went wrong');
        }
    })
    .catch(function(error) {
        console.log(error);
    });
}
