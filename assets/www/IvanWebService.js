function getObjectClass(obj) {
    if (obj && obj.constructor && obj.constructor.toString) {
        var arr = obj.constructor.toString().match(
            /function\s*(\w+)/);

        if (arr && arr.length == 2) {
            return arr[1];
        }
    }

    return typeof(obj);
}

function IvanWebService(url){
    this.url = url;        
    this.result = "";
    this.methodName = "";
}

IvanWebService.prototype.onDone = function(){}

IvanWebService.prototype.call = function(methodName, async, methodParams){
    this.methodName = methodName;
    
    var reqbody = "<?xml version=\"1.0\" encoding=\"utf-8\"?>"  +
    "<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
        "<soap:Body>" +
            "<" + this.methodName + " xmlns=\"http://tempuri.org/\">";
            
    for(i=0;i<methodParams.length;i++)
    {
        if(i % 2 == 0) {
            argName = methodParams[i];
        }
        else{
            reqbody += "<" + argName + ">";
            reqbody += this.writeVarValue(methodParams[i]);
            reqbody += "</" + argName + ">";
        }
    }
                                  
    reqbody += "</" + this.methodName + ">" +
        "</soap:Body>" +
    "</soap:Envelope>";
    
    var parentThis = this;
    
    var client = new XMLHttpRequest();
    client.open("POST", this.url, async);
    client.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
    client.setRequestHeader("SOAPAction", "http://tempuri.org/" + this.methodName);
    client.onreadystatechange = function() {
        if (client.readyState == 4) {
            parentThis.result = client.responseText;
            if (parentThis.onDone && typeof(parentThis.onDone) == "function") {
                parentThis.onDone();
            }
            //NOTE: this in here refers to var client, that's why we need to use parentThis instead            
        }
    } 
    client.send(reqbody);
}

IvanWebService.prototype.writeVarValue = function(clObj)
{
    var typ = getObjectClass(clObj);
    
    if(typ.toLowerCase() == "boolean" || typ.toLowerCase() == "string" || typ.toLowerCase() == "number"){
        var ret = clObj;
    }
    else if(typ.toLowerCase() == "date"){
        var d = clObj.getDate();
        var m = clObj.getMonth();
        m += 1; //month is zero based
        var y = clObj.getFullYear();
        
        var h = clObj.getHours();
        var i = clObj.getMinutes();
        var s = clObj.getSeconds();
        
        var ret = y + "-";
        if(m<10) ret += "0" + m + "-"; else ret += m + "-";
        if(d<10) ret += "0" + d + "T"; else ret += d + "T";
        if(h<10) ret += "0" + h + ":"; else ret += h + ":";
        if(i<10) ret += "0" + i + ":"; else ret += i + ":";
        if(s<10) ret += "0" + s; else ret += s;                
    }
    else if(typ.toLowerCase() == "array"){        
        var ret="";
        
        for(i=0;i<clObj.length;i++)
        {
            ret += this.writeVarValue(clObj[i]);
        }                
    }
    else{                
        var ret = "<" + typ + ">";
        
        for (var member in clObj) {
            ret += "<" + member + ">" + this.writeVarValue(clObj[member]) + "</" + member + ">";            
        }
        ret += "</" + typ + ">";                
    }
    
    return ret;
}

IvanWebService.prototype.getReturnValue = function(clObj)
{
	return this.parseVarValue(this.result, this.methodName + "Result", clObj);
}

IvanWebService.prototype.getVariableValue = function(name, clObj)    
{
    return this.parseVarValue(this.result, name, clObj);
}
    
IvanWebService.prototype.parseVarValue = function(body, name, clObj)
{   
    var start = body.indexOf("<" + name + ">"); 
    start += name.length + 2; //with < and > char
    var end = body.indexOf("</" + name + ">");   
    if(end == -1)
        body = "";
    else
        body = body.substring(start, end);
    
    var typ = getObjectClass(clObj);                
    
    if(typ.toLowerCase() == "boolean"){
        var ret = Boolean(body);
    }
    else if(typ.toLowerCase() == "string"){
        var ret = body;
    }
    else if(typ.toLowerCase() == "number"){
        var ret = Number(body);
    }
    else if(typ.toLowerCase() == "date"){
        var ret = new Date();
        ret.setFullYear(body.substring(0,4));
        ret.setMonth(body.substring(5,7) - 1);
        ret.setDate(body.substring(8,10));
        
        ret.setHours(body.substring(11,13));
        ret.setMinutes(body.substring(14,16));
        ret.setSeconds(body.substring(17,19));            
    }
    else if(typ.toLowerCase() == "array"){        
        var ret=new Array();
        if(body == "") return ret;
        
        var innerTyp = getObjectClass(clObj[0]); 
        
        var items = body.split("</" + innerTyp + ">");
        
        for(i=0;i<items.length;i++)
        {
            items[i] += "</" + innerTyp + ">";                    
            ret[i] = this.parseVarValue(items[i], innerTyp, clObj[0]);
        }
    }
    else{                
        var ret = Object.create(clObj);
        
        for (var member in ret) {
            ret[member] = this.parseVarValue(body, member, ret[member]);            
        }
    }
            
    return ret;     
}