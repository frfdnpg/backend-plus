"use strict";

/// <reference path="../node_modules/types.d.ts/modules/myOwn/in-myOwn.d.ts" />
/// <reference path="../../lib/in-backend-plus.d.ts" />
/// <reference path="../../src/for-client/my-localdb.ts" />
/// <reference path="../../src/for-client/my-websqldb.ts" />

import {LocalDb, LocalDbTransaction, TableDefinition} from "../for-client/my-localdb";
import {changing} from "best-globals";
import "mocha";
import { WebsqlDb } from "../for-client/my-websqldb";

function compare<T>(obtained:T, expected:T):boolean{
    expect(obtained).to.eql(expected);
    return true;
}

before(function(){
    // @ts-ignore
    window.myOwn=window.myOwn||{};
    // @ts-ignore
    window.myOwn.config=window.myOwn.config||{};
    // @ts-ignore
    window.myOwn.config.useragent=new UserAgent().parse(window.navigator.userAgent);
})

describe("websql-db", function(){
    var ldb:WebsqlDb;
    before(function(){
        this.timeout(10000);
        ldb = new WebsqlDb("the-test-name"+Math.random());
    });
    after(function(){
        //ldb.close();
    });
    describe("structures", function(){
        it("put and get structure", async function(){
            this.timeout(10000);
            var tableDef:TableDefinition={
                name:'this_name',
                fields:[
                    {name: 'pk1', typeName:'text'}
                ],
                primaryKey:['pk1']
            };
            await ldb.registerStructure(tableDef);
            var newTableDef = await ldb.getStructure(tableDef.name);
            compare(tableDef, newTableDef);
        });
        it("check if exists and exists", async function(){
            this.timeout(10000);
            var tableDef={
                name:'this_name',
                fields:[
                    {name: 'pk1', typeName:'text'}
                ],
                primaryKey:['pk1']
            };
            var exists:boolean = await ldb.existsStructure(tableDef.name);
            compare(true, exists);
        });
        it("check if exists and not exists", async function(){
            this.timeout(10000);
            var tableDef={
                name:'inexistent_this_name',
                fields:[
                    {name: 'pk1', typeName:'text'}
                ],
                primaryKey:['pk1']
            };
            var exists:boolean = await ldb.existsStructure(tableDef.name);
            compare(false, exists);
        });
        it("check empty structure", async function(){
            this.timeout(10000);
            var tableDef={
                name:'this_name',
                fields:[
                    {name: 'pk1', typeName:'text'}
                ],
                primaryKey:['pk1']
            };
            var isEmpty:boolean = await ldb.isEmpty(tableDef.name);
            compare(true, isEmpty);
        });
        it("reput and get structure", async function(){
            this.timeout(10000);
            var tableDef={
                name:'this_name',
                fields:[
                    {name: 'pk1', typeName:'text'},
                    {name: 'field1', typeName:'text'}
                ],
                primaryKey:['pk1']
            };
            await ldb.registerStructure(tableDef);
            var newTableDef = await ldb.getStructure(tableDef.name);
            compare(tableDef, newTableDef);
        });
        it("put another structure", async function(){
            this.timeout(10000);
            var tableDef={
                name:'other_name',
                fields:[
                    {name: 'pk2', typeName:'text'}
                ],
                primaryKey:['pk2']
            };
            await ldb.registerStructure(tableDef);
            var newTableDef = await ldb.getStructure(tableDef.name);
            compare(tableDef, newTableDef);
        });
        it("get all structures", async function(){
            this.timeout(10000);
            var tableDef1 = await ldb.getStructure('this_name');
            var tableDef2 = await ldb.getStructure('other_name');
            var tableDefs = await ldb.getAllStructures();
            compare([tableDef1, tableDef2], tableDefs);
        });
    });
    describe("data", function(){
        type Quantity = {
            quantity:string,
            preferedUnit:string
        }
        var tableDef:TableDefinition={
            name:'phisical_quantities',
            fields:[
                {name: 'quantity', typeName:'text'},
                {name: 'preferedUnit', typeName:'text'}
            ],
            primaryKey:['quantity']
        }
        var mass:Quantity = {quantity: 'mass', preferedUnit:'g'};
        var quantities:Quantity[]=[
            mass,
            {quantity:'time', preferedUnit:'s'},
            {quantity:'volume', preferedUnit:'l'},
        ];
        before(async function(){
            await ldb.registerStructure(tableDef);
        });
        it("put a value", async function(){
            var obtainedMass = await ldb.putOne("phisical_quantities", mass);
            compare(mass, obtainedMass);
        })
        it("put many", async function(){
            await ldb.putMany("phisical_quantities", quantities.slice(1));
        })
        it("check empty structure", async function(){
            var count:boolean = await ldb.isEmpty("phisical_quantities");
            compare(false, count);
        });
        it("get one", async function(){
            var volume = await ldb.getOne<Quantity>("phisical_quantities", ["volume"]);
            compare(volume, quantities[2]);
        })
        it("get one if exists and exists", async function(){
            var time = await ldb.getOneIfExists<Quantity>("phisical_quantities", ["time"]);
            compare(time, quantities[1]);
        })
        it("get one if exists and do not exists", async function(){
            var undef = await ldb.getOneIfExists<Quantity>("phisical_quantities", ["fourth dimension"]);
            compare(undef, undefined);
        })
        it("get all",async function(){
            var all = await ldb.getAll<Quantity>("phisical_quantities");
            compare(all, quantities);
        })
        it("clear all",async function(){
            await ldb.clear("phisical_quantities");
            var all = await ldb.getAll<Quantity>("phisical_quantities");
            compare(all, []);
        })
    });
    describe("childs",function(){
        type Units = {
            quantity:string,
            unit:string
        }
        var tableDef:TableDefinition={
            fields:[
                {name: 'quantity', typeName:'text'},
                {name: 'unit'    , typeName:'text'}
            ],
            name:'units',
            primaryKey:['quantity', 'unit']
        }
        var volumeUnits=[
            {quantity:'volume', unit:'ml'},
            {quantity:'volume', unit:'l'},
            {quantity:'volume', unit:'cm3'},
            {quantity:'volume', unit:'m3'},
        ]
        var volumeUnitsSorted=[
            {quantity:'volume', unit:'cm3'},
            {quantity:'volume', unit:'l'},
            {quantity:'volume', unit:'m3'},
            {quantity:'volume', unit:'ml'},
        ]
        var massUnits=[
            {quantity:'mass', unit:'g'},
            {quantity:'mass', unit:'kg'},
            {quantity:'mass', unit:'mg'},
        ]
        var timeUnits=[
            {quantity:'time', unit:'s'},
            {quantity:'time', unit:'h'},
        ]
        var units=volumeUnits.concat(massUnits).concat(timeUnits);
        before("",async function(){
            await ldb.registerStructure(tableDef);
            await ldb.putMany("units", units);
        })
        it("get cm3", async function(){
            var obtainedVolumes=await ldb.getOne<Units>("units", ["volume","cm3"]);
            compare(obtainedVolumes, volumeUnits[2]);
        })
        it("get volume childs", async function(){
            var obtainedVolumes=await ldb.getChild<Units>("units", ["volume"]);
            compare(obtainedVolumes, volumeUnitsSorted);
        })
        it("get mass childs", async function(){
            var obtainedMass=await ldb.getChild("units", ["mass"]);
            compare(obtainedMass, massUnits);
        })
    })
    describe("foreignKeys",function(){
        this.timeout(10000);
        type Product = {
            product:string,
            name:string,
            price:number,
            quantity_number: number,
            quantity: string,
            unit: string,
            units__description: string
        }
        type Units = {
            quantity:string,
            unit:string,
            description: string,
        }
        var unitsTableDef:TableDefinition={
            name:'units',
            fields:[
                {name: 'quantity'    , typeName:'text'},
                {name: 'unit'        , typeName:'text'},
                {name: 'description' , typeName:'text'}
            ],
            primaryKey:['quantity', 'unit']
        }
        var productsTableDef:TableDefinition={
            name:'products',
            fields:[
                {name: 'product'            , typeName:'text'},
                {name: 'name'               , typeName:'text'},
                {name: 'price'              , typeName:'decimal'},
                {name: 'quantity_number'    , typeName:'integer'},
                {name: 'quantity'           , typeName:'text'},
                {name: 'unit'               , typeName:'text'},
                {name: 'units__description' , typeName:'text'}
            ],
            primaryKey:['product'],
            foreignKeys: [{references:'units', fields:[{source:'quantity', target:'quantity'}, {source:'unit', target:'unit'}], displayFields:['description'], alias:'units'}]
        }
        var volumeUnits:Units[]=[
            {quantity:'volume', unit:'ml', description:'millilitre'},
            {quantity:'volume', unit:'l', description:'litre'},
            {quantity:'volume', unit:'cm3', description:'cubic centimetre'},
            {quantity:'volume', unit:'m3', description:'cubic metre'},
        ]
        var massUnits:Units[]=[
            {quantity:'mass', unit:'g', description:'gram'},
            {quantity:'mass', unit:'kg', description:'kilogram'},
            {quantity:'mass', unit:'mg', description:'milligram'},
        ]
        var timeUnits:Units[]=[
            {quantity:'time', unit:'s', description:'second'},
            {quantity:'time', unit:'m', description:'minute'},
            {quantity:'time', unit:'h', description:'hour'},
        ]

        var products:Product[]=[
            {product:'P11111', name: 'Gaseosa', price:35.50, quantity_number: 750, quantity: 'volume', unit: 'cm3', units__description: 'cubic centimetre'},
            {product:'P22222', name: 'Naranjas', price:25, quantity_number: 1, quantity: 'mass', unit: 'kg', units__description: 'kilogram'},
            {product:'P33333', name: 'Pelicula', price:150, quantity_number: 1.5, quantity: 'time', unit: 'h', units__description: 'hour'},
        ]
        var units=volumeUnits.concat(massUnits).concat(timeUnits);
        before("",async function(){
            await ldb.registerStructure(unitsTableDef);
            await ldb.registerStructure(productsTableDef);
            await ldb.putMany("units", units);
            await ldb.putMany("products", products);
        })
        it("get product and change unit", async function(){
            var myProduct=await ldb.getOne<Product>("products", ["P11111"]);
            myProduct.unit = 'ml';
            var myChangedProduct = await ldb.putOne("products", myProduct);
            compare(myChangedProduct, changing(products[0],{unit:'ml', units__description:'millilitre'}));
        })
    })
});
    

//
//describe("local-db-transaction", function(){
//    /** @type {(callback:(ldb:any)=>Promise<T>)=>Promise<T>} */
//    var inLdb;
//    var tableDef;
//    var tableDef2;
//    var tableDef3;
//    var databaseName: string;
//    before(function(){
//        databaseName = "the-test-name"+Math.random();
//        inLdb = new LocalDbTransaction(databaseName).getBindedInTransaction();
//        tableDef={
//            name:'this_name',
//            fields:[
//                {name: 'pk1', typeName:'text'}
//            ],
//            primaryKey:['pk1']
//        };
//        tableDef2={
//            name:'other_name',
//            fields:[
//                {name: 'pk2', typeName:'text'}
//            ],
//            primaryKey:['pk2']
//        };
//        tableDef3={
//            name:'another_name',
//            fields:[
//                {name: 'pk3', typeName:'text'}
//            ],
//            primaryKey:['pk3']
//        };
//    });
//    describe("structures", function(){
//        it("put and get structure", async function(){
//            this.timeout(10000);
//            var structure = await inLdb(async function(ldb){
//                await ldb.registerStructure(tableDef);
//                return ldb.getStructure(tableDef.name)
//            });
//            compare(tableDef,structure);
//        });
//        it("drop database and put structure", async function(){
//            this.timeout(10000);
//            await LocalDb.deleteDatabase(databaseName);
//            var structure = await inLdb(async function(ldb){
//                await ldb.registerStructure(tableDef);
//                return ldb.getStructure(tableDef.name)
//            });
//            compare(tableDef,structure);
//        });
//        it("drop database and put a collection of structures", async function(){
//            this.timeout(10000);
//            var structures = [tableDef, tableDef2, tableDef3]
//            await LocalDb.deleteDatabase(databaseName);
//            var registeredStructs = await inLdb(async function(ldb){
//                var promiseChain=Promise.resolve();
//                structures.forEach(async function(structureToRegister){
//                    promiseChain = promiseChain.then(function(){
//                        return ldb.registerStructure(structureToRegister);
//                    });
//                });
//                promiseChain = promiseChain.then(async function(){
//                    var struct = await ldb.getStructure(tableDef.name);
//                    var struct2 = await ldb.getStructure(tableDef2.name);
//                    var struct3 = await ldb.getStructure(tableDef3.name);
//                    return [struct,struct2,struct3]
//                });
//                return promiseChain;
//            });
//            compare(tableDef,registeredStructs[0]);
//            compare(tableDef2,registeredStructs[1]);
//            compare(tableDef3,registeredStructs[2]);
//        });
//    });
//});