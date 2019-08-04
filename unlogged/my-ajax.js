"use strict";
(function codenautasModuleDefinition(root, name, factory) {
    /* global define */
    /* istanbul ignore next */
    if(typeof root.globalModuleName !== 'string'){
        root.globalModuleName = name;
    }
    /* istanbul ignore next */
    if(typeof exports === 'object' && typeof module === 'object'){
        module.exports = factory();
    }else if(typeof define === 'function' && define.amd){
        define(factory);
    }else if(typeof exports === 'object'){
        // @ts-ignore
        exports[root.globalModuleName] = factory();
    }else{
        root[root.globalModuleName] = factory();
    }
    root.globalModuleName = null;
})(/*jshint -W040 */this, 'myAjax', function() {
/*jshint +W040 */

/*jshint -W004 */
var myAjax = {};
/*jshint +W004 */

/** @param {T} x
 *  @returns {T}
 *  @template {T}
 */
myAjax.functionId = function id(x){return x;}

function requireIfExists(moduleName){
    if(typeof process != "undefined"){
        return {}
    }
    try{
        // eslint-disable-next-line 
        return require(moduleName);
    }catch(err){
        return {};
    }
}

var LocalDb  = requireIfExists('./my-localdb' ).LocalDb ;
var WebSqlDb = requireIfExists('./my-websqldb').WebsqlDb;

var jsYaml = require('js-yaml');
var JSON4all = require('json4all');

myAjax.parseCookies = function parseCookies(){
    var prefix = location.pathname.replace(/(^|\/)[^/]*$/,'').substr(1)+':';
    window.cookies = this.parseStrCookies(document.cookie, prefix);
}

myAjax.parseStrCookies = function parseStrCookies(cookieString, prefix){
    var output = {};
    cookieString.split(/\s*;\s*/).forEach(function(pair) {
        pair = pair.split(/\s*=\s*/);
        var varName = pair[0];
        if(varName.substr(0,prefix.length)==prefix){
            varName=varName.slice(prefix.length);
        }
        output[varName] = pair.splice(1).join('=');
    });
    return output;
}

myAjax.readProcedureDefinitions=function readProcedureDefinitions(){
    var promise;
    var getStored=function(setupOrError){
        if(setupOrError && !(setupOrError instanceof Error) && !setupOrError.isoffline){
            localStorage.setItem('setup', JSON.stringify(setupOrError));
            return setupOrError;
        }
        var setupJson=localStorage.getItem('setup');
        if(setupJson){
            return JSON.parse(setupJson);
        }
        throw new Error("NOT CLIENT-CONFIGURED")
    }
    promise = my.ajaxPromise({
        action:'client-setup',
        method:'get',
        encoding:'JSON',
        parameters:[],
        progress:false
    }).then(getStored, getStored);
    return promise.then(function(setup){
        my.config = setup;
    }).then(function(){
        my.config.procedure=my.config.procedure||{};
        my.config.procedures.forEach(/** @param {bp.ProcedureDef} procedureDef */function(procedureDef){
            my.config.procedure[procedureDef.action]=procedureDef;
            var target;
            /** @type {string} */
            var lastName;
            procedureDef.parameter=procedureDef.parameter||{};
            procedureDef.parameters.forEach(function(parameterDef){
                procedureDef.parameter[parameterDef.name]=parameterDef;
            });
            var partsNames=procedureDef.action.split('/').filter(my.functionId).forEach(function(name){
                if(lastName){
                    if(!target[lastName]){
                        target[lastName]={"dont-use":lastName};
                    }else if(target[lastName]["dont-use"]!==lastName){
                        throw new Error("Bad nesting of procedures");
                    }
                    target=target[lastName];
                }else{
                    target=my.ajax;
                }
                lastName=name;
            });
            target[lastName]=my.ajaxPromise.bind(my,procedureDef);
            var activeUserElement = document.getElementById('active-user');
            if(activeUserElement){
                activeUserElement.textContent=my.config.username||'-';
            }
        });
        var gridBuffer = my.config.config['grid-buffer'];
        var offlineMode = gridBuffer && (gridBuffer === 'idbx' || gridBuffer === 'wsql');
        if(offlineMode){
            try{
                switch(gridBuffer) {
                    case 'idbx':
                        my.ldb = new LocalDb(my.appName+my.clientVersion);
                        ///** @type {(callback:(ldb:any)=>Promise<T>)=>Promise<T>} */
                        //my.inLdb = new LocalDbTransaction(my.appName+my.clientVersion).getBindedInTransaction()
                        break;
                    case 'wsql':
                        my.ldb = new WebSqlDb(my.appName+my.clientVersion);
                        break;
                    default:
                        throw new Error('grid buffer name is bad defined')
                    }
            }catch(err){
                my.log(err);
            }
        }
    }).catch(function(err){
        console.log('error setting myOwn.ajax');
        throw err;
    });
};

myAjax.ajaxPromise = function ajaxPromise(procedureDef,data,opts){
    opts = opts || {};
    if(!('visiblyLogErrors' in opts)){
        opts.visiblyLogErrors=true;
    }
    var my = this;
    if(opts.launcher){
        if(!opts.launcher.originalTitle){
            opts.launcher.originalTitle=opts.launcher.title;
        }else{
            opts.launcher.title=opts.launcher.originalTitle;
        }
        opts.launcher.setAttribute('my-working','working');
    }
    myAjax.parseCookies();
    return Promise.resolve().then(function(){
        var startTime=bestGlobals.datetime.now();
        var tickTime=startTime;
        var lineNumber=0;
        var lineProgress=null;
        var params={};
        procedureDef.parameters.forEach(function(paramDef){
            var value=bestGlobals.coalesce(data[paramDef.name],'defaultValue' in paramDef?paramDef.defaultValue:bestGlobals.coalesce.throwErrorIfUndefined("lack of parameter "+paramDef.name));
            value = my.encoders[paramDef.encoding].stringify(value);
            params[paramDef.name]=value;
        });
        if(data && data.files){
            params.files=data.files;
        }
        var result=[];
        var progress=procedureDef.progress!==false;
        var divProgress;
        var onClose=function(){}
        var defaultInformProgress = function defaultInformProgress(progressInfo){
            if(progressInfo.message || progressInfo.end){
                if(!divProgress){
                    var idAutoClose='id-auto-close-'+Math.random();
                    var checkAutoClose=html.input({type:'checkbox', id:idAutoClose, checked:myOwn.ajaxPromise.autoClose}).create();
                    var divButton=html.div({style:'height:40px'},[
                        my.messages.viewProgress,
                        html.div([
                            checkAutoClose,
                            html.label({for:idAutoClose}, my.messages.autoCloseWhenEnds),
                        ])
                    ]).create();
                    checkAutoClose.addEventListener('change',function(){
                        myOwn.ajaxPromise.autoClose=checkAutoClose.checked;
                    });
                    divProgress=html.div({class:'result-progress'}).create();
                    simpleFormPromise({elementsList:[divButton,divProgress]});
                    onClose=function(err){
                        var closeButton=html.button(DialogPromise.messages.Ok).create();
                        var stopCountDown=html.button(my.messages.stopCountDown).create();
                        divButton.innerHTML="";
                        divButton.appendChild(closeButton);
                        closeButton.onclick=function(){
                            divButton.dialogPromiseDone();
                        }
                        if(err){
                            divProgress.appendChild(html.div({class:'error-message'},err.message).create())
                        }
                        if(myOwn.ajaxPromise.autoClose && !err){
                            setTimeout(function(){
                                divButton.dialogPromiseDone();
                            },myOwn.ajaxPromise.autoClose);
                        }
                    }
                }
                var now=bestGlobals.datetime.now();
                var elapsed = now.sub(tickTime);
                tickTime=now;
                if(lineProgress){
                    if(lineProgress.elapsed){
                        lineProgress.elapsed.textContent=elapsed.toHmsOrMs();
                    }
                    if(lineProgress.acum){
                        lineProgress.acum.textContent=now.sub(startTime).toHmsOrMs()
                    }
                }
                if(progressInfo.message){
                    lineProgress={
                        elapsed:html.span({class:'my-progress-step-t'},'..:....').create(),
                        acum   :html.span({class:'my-progress-acum-t'},'..:....').create()
                    };
                    divProgress.insertBefore(
                        html.div({class:'my-progress'}, [
                            html.span({class:'my-progress-num'}, ++lineNumber)," ",
                            lineProgress.elapsed," ",
                            lineProgress.acum," ",
                            progressInfo.message||''
                        ]).create(),
                        divProgress.childNodes[0]
                    );
                }
            }
        }
        var informProgress;
        if(opts.divProgress){
            divProgress=opts.divProgress;
            if(opts.informProgress){
                informProgress = function(progress){
                    if(progress.message){
                        defaultInformProgress(progress)
                    }else{
                        opts.informProgress(progress)
                    }
                }
            }else{
                informProgress = defaultInformProgress;
            }
        }else{
            informProgress = opts.informProgress || defaultInformProgress;
        }
        var controlLoggedIn = function controlLoggedIn(result){
            if(result && result[0]=="<" && result.match(/login/m)){
                console.log('xxxxxxxxxxx',procedureDef.action)
                my.informDetectedStatus('notLogged');
                throw bestGlobals.changing(new Error(my.messages.notLogged),{displayed:true, isNotLoggedError:true});
            }
            my.informDetectedStatus('logged', true);
        }
        return AjaxBestPromise[procedureDef.method]({
            multipart:procedureDef.files,
            url:procedureDef.action,
            data:params,
            uploading:opts.uploading
        }).onLine(function(line,ender){
            controlLoggedIn(line);
            if(progress){
                if(line.substr(0,2)=='--'){
                    progress=false;
                }else{
                    var info=JSON.parse(line);
                    if(info.error){
                        var err = new Error(info.error.message);
                        likeAr(info.error).forEach(function(value, name){
                            if(name!='message'){
                                err[name]=value;
                            }
                        })
                        throw err;
                    }
                    informProgress(info.progress);
                }
            }else{
                result.push(line||ender);
            }
        }).then(function(){
            if(procedureDef.setCookies){
                myAjax.parseCookies()
            }
            onClose();
            result=result.join('');
            controlLoggedIn(result);
            if(lineNumber){
                informProgress({end:true})
            }
            return my.encoders[procedureDef.encoding].parse(result);
        }).catch(function(err){
            onClose(err);
            if(opts.launcher){
                opts.launcher.setAttribute('my-working','error');
                opts.launcher.title='err';
            }
            if(!err.isNotLoggedError) {
                if(!window.navigator.onLine) {
                    my.informDetectedStatus('noNetwork');
                }else if(!!err.originalError) {
                    my.informDetectedStatus('noServer');
                    if(my.server.connected){
                        my.server.connected = false
                        my.server.broadcaster.dispatchEvent(new Event('noServer'));
                    }
                } else {
                    my.informDetectedStatus('logged', true);
                }
            }
            if(!err.displayed && opts.visiblyLogErrors || err.status==403){
                my.log(err);
            }
            throw err;
        });
    });
};

myAjax.encoders = {
    JSON: { parse: JSON.parse, stringify: JSON.stringify },
    plain: { 
        parse: function(x){return x;}, 
        stringify: function(x){
            if(typeof x === "object" /* && !(x instanceof FileList)*/){
                throw new Error("Invalid plain type "+(x==null?value:typeof x)+" detected");
            }
            return x;
        }
    },
    yaml: {
        parse: jsYaml.load.bind(jsYaml),
        stringify: jsYaml.dump.bind(jsYaml),
    },
    JSON4all: {
        parse: JSON4all.parse,
        stringify: JSON4all.stringify,
    },
};

myAjax.ajaxPromise.autoClose=6000;

return myAjax;

});
