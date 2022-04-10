function enviarDados() {
    let imgUrl = document.getElementById("imgPath").submit();
    let xmlUrl = document.getElementById("xmlPath").submit(); 
    let imgNome = document.getElementById("imgName").submit();
    let htmlUrl = document.getElementById("htmPath").submit();
    // document.getElementById('IDDOSEUFORM').submit();
}


// function dadosParaServ(url, body) {
//     console.log("Body=", typeof(JSON.stringify(Object.keys(body))));
//     console.log(url);
//     let request = new XMLHttpRequest();
//     request.open("POST", url, true);
//     request.setRequestHeader("Content-type", "application/json; charset=UTF-8");
//     request.send(JSON.stringify(body));
    
//     request.onload = function () {
//         console.log(this.responseText);
//     }
// // 
//     // alert(body);
//     return request.responseText;
    
// }

// function enviarDados() {
//     let url = "http://127.0.0.1:5000/selecionaImagem";
//     // let url = '/viewportT';
//     let imgUrl = document.getElementById("imgPath").value;
//     let xmlUrl = document.getElementById("xmlPath").value; 
//     let imgNome = document.getElementById("imgName").value;
//     let htmlUrl = document.getElementById("htmPath").value;
//     console.log(typeof(imgUrl));
//     console.log(xmlUrl);
//     console.log(imgNome);
//     console.log(htmlUrl);

//     const body = {"imgUrl" : imgUrl, "xmlUrl" : xmlUrl, "imgNome": imgNome, "htmlUrl": htmlUrl}
//     console.log(JSON.stringify(body));
//     dadosParaServ(url, body);
// }

// function enviarDadosDois() {
//     let imgUrl = document.getElementById("imgPath").value;
//     let xmlUrl = document.getElementById("xmlPath").value; 
//     let imgNome = document.getElementById("imgName").value;
//     let htmlUrl = document.getElementById("htmPath").value;

//     fetch('/viewportTeste00', {
//         headers : {
//             'Content-Type' : 'application/json'
//         },
//         method : 'POST',
//         body : JSON.stringify({
//             'imgUrl' : imgUrl,
//             'xmlUrl' : xmlUrl,
//             'imgNome': imgNome,
//             'htmlUrl': htmlUrl

//         })
//     })
//     .then(function (response){

//         if(response.ok) {
//             response.json()
//             .then(function(response) {
//                 console.log(response);
//             });
//         }
//         else {
//             throw Error('Something went wrong');
//         }
//     })
//     .catch(function(error) {
//         console.log(error);
//     });
// }


// $(document).ready(function() {

// 	$('form').on('submit', function(event) {

// 		$.ajax({
// 			data : {
// 				imgUrl : $('#imgPath').val(),
// 				xmlUrl : $('#xmlPath').val(),
//                 imgNome: $('#imgName').val(),
//                 htmlUrl: $('#htmPath').val()
// 			},
// 			type : 'POST',
// 			url : '/viewportTeste'
// 		})
// 		.done(function(data) {

// 			if (data.error) {
// 				$('#errorAlert').text(data.error).show();
// 				$('#successAlert').hide();
// 			}
// 			else {
// 				$('#successAlert').text(data.name).show();
// 				$('#errorAlert').hide();
// 			}

// 		});

// 		event.preventDefault();

// 	});

// });