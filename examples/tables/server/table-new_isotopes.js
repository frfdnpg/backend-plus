"use strict";

var changing = require('best-globals').changing;
var definnerIsotopes = require('../server/table-isotopes.js');

module.exports = function(context){
    var defNewElement = definnerIsotopes(context);
    defNewElement=changing(defNewElement,{
        name:'new_isotopes',
        tableName:'isotopes',
        elementName:'new isotope',
        forInsertOnlyMode:true,
        layout:{vertical:true},
        // sql:{isTable:false}
    });
    context.be.tableDefAdapt.forInsertOnly(defNewElement);
    return defNewElement;
}
