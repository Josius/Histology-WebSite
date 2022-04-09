function enviarParaServer(url, body){
    console.log("Body=",body);
    let request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.setRequestHeader("Content-type", "application/json");
    request.send(JSON.stringify(body));
    
    request.onload = function(){
        console.log(this.responseText);
    }

    return request.responseText;
    // alert(body);
}

function dadosDeVisualizacao() {
    
    let url = "http://127.0.0.1:5000/viewportTeste00";
    // let url = "./viewportTeste00";
    let imgUrl = document.getElementById("imgPath").value;
    let xmlUrl = document.getElementById("xmlPath").value; 
    let imgNome = document.getElementById("imgName").value;

    body = {
        "imgUrl": imgUrl,
        "xmlUrl": xmlUrl,
        "imgNome": imgNome
    }

    enviarParaServer(url, body);
}