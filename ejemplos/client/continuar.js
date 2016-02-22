"use script";

var html=jsToHtml.html;

function presentarFormulario(estructura){
    var titulo=[];
    var preguntas=[];
    estructura.forEach(function(fila){
        if(fila.tipo=='TITULO'){
            titulo.push(html.div({id:"titulo"},JSON.stringify(fila.texto)))
        }
        if(fila.tipo=='PREGUNTA'){
            preguntas.push(html.tr({"class":"preguntas",id:fila.id},fila.texto));
            var respuestas=[];
            /*
            preguntas.push(html.br());
            fila.opciones.forEach(function(opcion){
                preguntas.push(html.td([         
                    html.label({"for":"opciones"},opcion.texto),
                    html.input({"class":"opc-resp",type:"checkbox"})
                ]));
                preguntas.push(html.br());
            });
            preguntas.push(html.br());
            */
            var opciones={};
            fila.opciones.forEach(function(opcion){
                opciones[opcion.opcion]={label:opcion.texto};
            });
            console.log("Tedede = ",Tedede);
            preguntas.push(Tedede.optionsCtrl(null,opciones));
        }
        console.log(preguntas);
    });
    pantalla.appendChild(html.div([
        html.tr(titulo),
        html.div({"class":"bloque"},preguntas),
    ]).create());
}

function ponerDatos(datos){
    
}

window.addEventListener("load",function(){
   // console.log("HOLA MUNDO");
    AjaxBestPromise.get({
        url:'/info-enc-act',
        data:{}
    }).then(function(resultJson){
        var result=JSON.parse(resultJson);
        presentarFormulario(result.estructura);
        ponerDatos(result.datos);
    });
});