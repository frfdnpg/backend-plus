"use script";

function classToggle(element,clase, sacoAgrego ){
    if(sacoAgrego){
        element.classList.add(clase);
    }else{
        element.classList.remove(clase);
    } 
}

var html=jsToHtml.html;

function presentarFormulario(estructura){
    var celdasDesplegadas=[];
    var controles=[];
    var divFormulario=html.div({"tedede-formulario":"trac"}).create();
    var luego = Promise.resolve();
    estructura.celdas.forEach(function(fila){
        var contenidoCelda=[];
        if(fila.tipo=='titulo'){
            contenidoCelda.push(html.div({"class":"titulo", id:"titulo"},fila.titulo))
        }
        if(fila.tipo=='texto'){
            contenidoCelda.push(html.div({"class":"texto"},fila.texto))
        }
        if(fila.tipo=='pregunta'){
            contenidoCelda.push(html.div({"class":"codigo"},fila.pregunta));
            contenidoCelda.push(html.div({"class":fila.subtipo||"preguntas",id:fila.pregunta},fila.texto));
            if(fila.aclaracion){
                contenidoCelda.push(html.div({"class":"aclaracion"},fila.aclaracion));
            }
            var controlOpciones = Tedede.bestCtrl(fila.typeInfo).create();
            contenidoCelda.push(html.div({"class":["opciones", fila.typeInfo.typeName]}, [controlOpciones]));
            luego = luego.then(function(){
                Tedede.adaptElement(controlOpciones,fila.typeInfo);
                controlOpciones.setAttribute("tedede-var", fila.variable);
                controlOpciones.addEventListener('update',function(){
                    var value = this.getTypedValue();
                    postAction('guardar',{
                        id: divFormulario.idRegistro,
                        variable: fila.variable,
                        valor:value
                    });
                });
                controles.push(controlOpciones);
            });
        }
        celdasDesplegadas.push(html.div({"class": "celda"}, contenidoCelda));
    });
    divFormulario.appendChild(html.div({"class":"bloque"},[
        html.label({"for": "modo-revisar"}, "modo revisar"),
        html.input({type: "checkbox", "id": "modo-revisar"}),
    ]).create());
    divFormulario.appendChild(html.div({"class":"bloque"},celdasDesplegadas).create());
    pantalla.appendChild(divFormulario);
    pantalla.appendChild(html.input({type:"button",id:"botonFin", value:"Finalizar"}).create());
    return luego.then(function(){
        var bFin = document.getElementById('botonFin');
        bFin.addEventListener('click', function() {
            var data = {
                id: divFormulario.idRegistro,
                datos: {}
            };
            controles.forEach(function(control){
                data.datos[control.getAttribute("tedede-var")] = control.getTypedValue();
            });
            postAction('finalizar', data).then(function(){
                window.location = 'fin-ingreso';
            });
        });
        document.getElementById("modo-revisar").addEventListener('change', function(){
            var divContenedor=this;
            while(divContenedor && !divContenedor.getAttribute("tedede-formulario")){
                divContenedor=divContenedor.parentNode;
            }
            if(!divContenedor){
                throw new Error("No encontre en tedede-formulario");
            }
            classToggle(divContenedor, "modo-revisar", this.checked);
        });
        return divFormulario;
    });
}

function ponerDatos(datos) {
    
}

window.addEventListener("load",function(){
    document.getElementById('status').textContent = "Cargando...";
    AjaxBestPromise.post({
        url:'info-enc-act',
        data:{info:"{}"}
    }).then(function(resultJson){
        var result=JSON.parse(resultJson);
        presentarFormulario(result.estructura.formularios[result.id["for"]]).then(function(divFormulario){
            divFormulario.idRegistro = result.id;
            ponerDatos(result.datos);
        });
    }).catch(function(err){
        document.getElementById('status').textContent = "Error "+err.message;
    });
});