"use strict";

module.exports = function(context){
    var admin = context.user.rol==='boss';
    return context.be.tableDefAdapt({
        name:'bigint',
        title:'prueba de bigint type',
        editable:admin,
        fields:[
            {name:'id'              , typeName:'integer'  , nullable:false},
            {name:'nombre'          , typeName:'text'                     },
            {name:'col_bigint'      , typeName:'bigint'                   },
            {name:'col_number'      , typeName:'decimal'                   },
            {name:'intervalos'      , typeName:'interval', timeUnit:'minutes' },
            {name:'col_decimal'     , typeName:'decimal'                  },
            {name:'col_ts'          , typeName:'timestamp'                },
        ],
        primaryKey:['id']
    });
}
