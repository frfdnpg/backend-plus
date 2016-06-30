"use strict";

var tableDefCompleter = require('./table-def-completer.js');

module.exports = tableDefCompleter({
    name:'ptable',
    title:'periodic table',
    fields:[
        {name:'atomic_number'       , typeName:'integer', nullable:false,                },
        {name:'symbol'              , typeName:'text'   , nullable:false, 'max-length':4 },
        {name:'name'                , typeName:'text'                                    },
        {name:'weight'              , typeName:'number' , exact:true, decimals: true     },
        {name:'group'               , typeName:'text'                                    },
        {name:'discovered_date'     , typeName:'date'                                    },
        {name:'discovered_precision', typeName:'text'   , options:['year','day'],        },
        {name:'bigbang'             , typeName:'boolean'                                 },
        {name:'column'              , typeName:'integer'                                 },
        {name:'period'              , typeName:'integer'                                 },
        {name:'block'               , typeName:'text'                                    },
        {name:'state at STP'        , typeName:'text'                                    },
        {name:'ocurrence'           , typeName:'text'                                    },
        {name:'description'         , typeName:'text'                                    },
    ],
    primaryKey:['atomic_number'],
    constraints:[
        {constraintType:'unique', fields:['symbol']}
    ]
});
