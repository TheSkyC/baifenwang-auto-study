// ==UserScript==
// @name           百分网自动刷课助手
// @description    自动完成百分网人脸验证与课程播放，支持防切屏检测与人脸图片管理
// @namespace      https://greasyfork.org/baifenwang-auto-study
// @version        1.3.0
// @author         TheSkyC
// @license        MIT
// @homepageURL    https://github.com/TheSkyC/baifenwang-auto-study
// @supportURL     https://github.com/TheSkyC/baifenwang-auto-study/issues
// @updateURL      https://baifenwang-auto-study.tarxf.com/latest.user.js
// @downloadURL    https://baifenwang-auto-study.tarxf.com/latest.user.js
// @match          *://*.tj.100.wang/*
// @run-at         document-start
// @compatible     Tampermonkey
// @compatible     Greasemonkey
// @compatible     Violentmonkey
// @compatible     ScriptCat
// @compatible     AdGuard
// @grant          none
// ==/UserScript==
/*!

JSZip v3.10.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/main/LICENSE
*/

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).JSZip=e()}}(function(){return function s(a,o,h){function u(r,e){if(!o[r]){if(!a[r]){var t="function"==typeof require&&require;if(!e&&t)return t(r,!0);if(l)return l(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[r]={exports:{}};a[r][0].call(i.exports,function(e){var t=a[r][1][e];return u(t||e)},i,i.exports,s,a,o,h)}return o[r].exports}for(var l="function"==typeof require&&require,e=0;e<h.length;e++)u(h[e]);return u}({1:[function(e,t,r){"use strict";var d=e("./utils"),c=e("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,i,s,a,o,h=[],u=0,l=e.length,f=l,c="string"!==d.getTypeOf(e);u<e.length;)f=l-u,n=c?(t=e[u++],r=u<l?e[u++]:0,u<l?e[u++]:0):(t=e.charCodeAt(u++),r=u<l?e.charCodeAt(u++):0,u<l?e.charCodeAt(u++):0),i=t>>2,s=(3&t)<<4|r>>4,a=1<f?(15&r)<<2|n>>6:64,o=2<f?63&n:64,h.push(p.charAt(i)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(e){var t,r,n,i,s,a,o=0,h=0,u="data:";if(e.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(e.charAt(e.length-1)===p.charAt(64)&&f--,e.charAt(e.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=c.uint8array?new Uint8Array(0|f):new Array(0|f);o<e.length;)t=p.indexOf(e.charAt(o++))<<2|(i=p.indexOf(e.charAt(o++)))>>4,r=(15&i)<<4|(s=p.indexOf(e.charAt(o++)))>>2,n=(3&s)<<6|(a=p.indexOf(e.charAt(o++))),l[h++]=t,64!==s&&(l[h++]=r),64!==a&&(l[h++]=n);return l}},{"./support":30,"./utils":32}],2:[function(e,t,r){"use strict";var n=e("./external"),i=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,n,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=i}o.prototype={getContentWorker:function(){var e=new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),e},getCompressedWorker:function(){return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){"use strict";var n=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},r.DEFLATE=e("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){"use strict";var n=e("./utils");var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}(0|t,e,e.length,0):function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t.charCodeAt(a))];return-1^e}(0|t,e,e.length,0):0}},{"./utils":32}],5:[function(e,t,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(e,t,r){"use strict";var n=null;n="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:n}},{lie:37}],7:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,i=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=n?"uint8array":"array";function h(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var t=this;this._pako.onData=function(e){t.push({data:e,meta:t.meta})}},r.compressWorker=function(e){return new h("Deflate",e)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){"use strict";function A(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n}function n(e,t,r,n,i,s){var a,o,h=e.file,u=e.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),c=I.transformTo("string",O.utf8encode(h.name)),d=h.comment,p=I.transformTo("string",s(d)),m=I.transformTo("string",O.utf8encode(d)),_=c.length!==h.name.length,g=m.length!==d.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(x.crc32=e.crc32,x.compressedSize=e.compressedSize,x.uncompressedSize=e.uncompressedSize);var S=0;t&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===i?(C=798,z|=function(e,t){var r=e;return e||(r=t?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(e){return 63&(e||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+c,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(n,4)+f+b+p}}var I=e("../utils"),i=e("../stream/GenericWorker"),O=e("../utf8"),B=e("../crc32"),R=e("../signature");function s(e,t,r,n){i.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}I.inherits(s,i),s.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,i.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}))},s.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=n(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},s.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,r=n(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:function(e){return R.DATA_DESCRIPTOR+A(e.crc32,4)+A(e.compressedSize,4)+A(e.uncompressedSize,4)}(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},s.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,n=function(e,t,r,n,i){var s=I.transformTo("string",i(n));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(e,2)+A(e,2)+A(t,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:n,meta:{percent:100}})},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},s.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()}),e.on("error",function(e){t.error(e)}),this},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(e){var t=this._sources;if(!i.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},s.prototype.lock=function(){i.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=s},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){"use strict";var u=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,a,t){var o=new n(a.streamFiles,t,a.platform,a.encodeFileName),h=0;try{e.forEach(function(e,t){h++;var r=function(e,t){var r=e||t,n=u[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(t.options.compression,a.compression),n=t.options.compressionOptions||a.compressionOptions||{},i=t.dir,s=t.date;t._compressWorker(r,n).withStreamInfo("file",{name:e,dir:i,date:s,comment:t.comment||"",unixPermissions:t.unixPermissions,dosPermissions:t.dosPermissions}).pipe(o)}),o.entriesCount=h}catch(e){o.error(e)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){"use strict";function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}(n.prototype=e("./object")).loadAsync=e("./load"),n.support=e("./support"),n.defaults=e("./defaults"),n.version="3.10.1",n.loadAsync=function(e,t){return(new n).loadAsync(e,t)},n.external=e("./external"),t.exports=n},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){"use strict";var u=e("./utils"),i=e("./external"),n=e("./utf8"),s=e("./zipEntries"),a=e("./stream/Crc32Probe"),l=e("./nodejsUtils");function f(n){return new i.Promise(function(e,t){var r=n.decompressed.getContentWorker().pipe(new a);r.on("error",function(e){t(e)}).on("end",function(){r.streamInfo.crc32!==n.decompressed.crc32?t(new Error("Corrupted zip : CRC32 mismatch")):e()}).resume()})}t.exports=function(e,o){var h=this;return o=u.extend(o||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:n.utf8decode}),l.isNode&&l.isStream(e)?i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):u.prepareContent("the loaded zip file",e,!0,o.optimizedBinaryString,o.base64).then(function(e){var t=new s(o);return t.load(e),t}).then(function(e){var t=[i.Promise.resolve(e)],r=e.files;if(o.checkCRC32)for(var n=0;n<r.length;n++)t.push(f(r[n]));return i.Promise.all(t)}).then(function(e){for(var t=e.shift(),r=t.files,n=0;n<r.length;n++){var i=r[n],s=i.fileNameStr,a=u.resolve(i.fileNameStr);h.file(a,i.decompressed,{binary:!0,optimizedBinaryString:!0,date:i.date,dir:i.dir,comment:i.fileCommentStr.length?i.fileCommentStr:null,unixPermissions:i.unixPermissions,dosPermissions:i.dosPermissions,createFolders:o.createFolders}),i.dir||(h.file(a).unsafeOriginalName=s)}return t.zipComment.length&&(h.comment=t.zipComment),h})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../stream/GenericWorker");function s(e,t){i.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}n.inherits(s,i),s.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on("data",function(e){t.push({data:e,meta:{percent:0}})}).on("error",function(e){t.isPaused?this.generatedError=e:t.error(e)}).on("end",function(){t.isPaused?t._upstreamEnded=!0:t.end()})},s.prototype.pause=function(){return!!i.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){"use strict";var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",function(e,t){n.push(e)||n._helper.pause(),r&&r(t)}).on("error",function(e){n.emit("error",e)}).on("end",function(){n.push(null)})}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume()},t.exports=n},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){"use strict";t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},{}],15:[function(e,t,r){"use strict";function s(e,t,r){var n,i=u.getTypeOf(t),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(e=g(e)),s.createFolders&&(n=_(e))&&b.call(this,n,!0);var a="string"===i&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(t instanceof c&&0===t.uncompressedSize||s.dir||!t||0===t.length)&&(s.base64=!1,s.binary=!0,t="",s.compression="STORE",i="string");var o=null;o=t instanceof c||t instanceof l?t:p.isNode&&p.isStream(t)?new m(e,t):u.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var h=new d(e,o,s);this.files[e]=h}var i=e("./utf8"),u=e("./utils"),l=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),f=e("./defaults"),c=e("./compressedObject"),d=e("./zipObject"),o=e("./generate"),p=e("./nodejsUtils"),m=e("./nodejs/NodejsStreamInputAdapter"),_=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return 0<t?e.substring(0,t):""},g=function(e){return"/"!==e.slice(-1)&&(e+="/"),e},b=function(e,t){return t=void 0!==t?t:f.createFolders,e=g(e),this.files[e]||s.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function h(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var n={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n)},filter:function(r){var n=[];return this.forEach(function(e,t){r(e,t)&&n.push(t)}),n},file:function(e,t,r){if(1!==arguments.length)return e=this.root+e,s.call(this,e,t,r),this;if(h(e)){var n=e;return this.filter(function(e,t){return!t.dir&&n.test(e)})}var i=this.files[this.root+e];return i&&!i.dir?i:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(e,t){return t.dir&&r.test(e)});var e=this.root+r,t=b.call(this,e),n=this.clone();return n.root=t.name,n},remove:function(r){r=this.root+r;var e=this.files[r];if(e||("/"!==r.slice(-1)&&(r+="/"),e=this.files[r]),e&&!e.dir)delete this.files[r];else for(var t=this.filter(function(e,t){return t.name.slice(0,r.length)===r}),n=0;n<t.length;n++)delete this.files[t[n].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=u.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var n=r.comment||this.comment||"";t=o.generateWorker(this,r,n)}catch(e){(t=new l("error")).error(e)}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=n},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){"use strict";t.exports=e("stream")},{stream:void 0}],17:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===n&&this.data[s+3]===i)return s-this.zero;return-1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&n===s[2]&&i===s[3]},i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){"use strict";var n=e("../utils");function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i},{"../utils":32}],19:[function(e,t,r){"use strict";var n=e("./Uint8ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){"use strict";var n=e("./ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),h=e("./Uint8ArrayReader");t.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||i.uint8array?"nodebuffer"===t?new o(e):i.uint8array?new h(n.transformTo("uint8array",e)):new s(n.transformTo("array",e)):new a(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){"use strict";r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b"},{}],24:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../utils");function s(e){n.call(this,"ConvertWorker to "+e),this.destType=e}i.inherits(s,n),s.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta})},t.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../crc32");function s(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}e("../utils").inherits(s,n),s.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}n.inherits(s,i),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}i.prototype.processChunk.call(this,e)},t.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then(function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat()},function(e){t.error(e)})}n.inherits(s,i),s.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,n.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){"use strict";function n(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}n.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.end()}),e.on("error",function(e){t.error(e)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var e=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=n},{}],29:[function(e,t,r){"use strict";var h=e("../utils"),i=e("./ConvertWorker"),s=e("./GenericWorker"),u=e("../base64"),n=e("../support"),a=e("../external"),o=null;if(n.nodestream)try{o=e("../nodejs/NodejsStreamOutputAdapter")}catch(e){}function l(e,o){return new a.Promise(function(t,r){var n=[],i=e._internalType,s=e._outputType,a=e._mimeType;e.on("data",function(e,t){n.push(e),o&&o(t)}).on("error",function(e){n=[],r(e)}).on("end",function(){try{var e=function(e,t,r){switch(e){case"blob":return h.newBlob(h.transformTo("arraybuffer",t),r);case"base64":return u.encode(t);default:return h.transformTo(e,t)}}(s,function(e,t){var r,n=0,i=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(i=new Uint8Array(s),r=0;r<t.length;r++)i.set(t[r],n),n+=t[r].length;return i;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(i,n),a);t(e)}catch(e){r(e)}n=[]}).resume()})}function f(e,t,r){var n=t;switch(t){case"blob":case"arraybuffer":n="uint8array";break;case"base64":n="string"}try{this._internalType=n,this._outputType=t,this._mimeType=r,h.checkSupport(n),this._worker=e.pipe(new i(n)),e.lock()}catch(e){this._worker=new s("error"),this._worker.error(e)}}f.prototype={accumulate:function(e){return l(this,e)},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,function(e){t.call(r,e.data,e.meta)}):this._worker.on(e,function(){h.delay(t,arguments,r)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var n=new ArrayBuffer(0);try{r.blob=0===new Blob([n],{type:"application/zip"}).size}catch(e){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(n),r.blob=0===i.getBlob("application/zip").size}catch(e){r.blob=!1}}}try{r.nodestream=!!e("readable-stream").Readable}catch(e){r.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,s){"use strict";for(var o=e("./utils"),h=e("./support"),r=e("./nodejsUtils"),n=e("./stream/GenericWorker"),u=new Array(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;u[254]=u[254]=1;function a(){n.call(this,"utf-8 decode"),this.leftOver=null}function l(){n.call(this,"utf-8 encode")}s.utf8encode=function(e){return h.nodebuffer?r.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=h.uint8array?new Uint8Array(o):new Array(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t}(e)},s.utf8decode=function(e){return h.nodebuffer?o.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,i,s=e.length,a=new Array(2*s);for(t=r=0;t<s;)if((n=e[t++])<128)a[r++]=n;else if(4<(i=u[n]))a[r++]=65533,t+=i-1;else{for(n&=2===i?31:3===i?15:7;1<i&&t<s;)n=n<<6|63&e[t++],i--;1<i?a[r++]=65533:n<65536?a[r++]=n:(n-=65536,a[r++]=55296|n>>10&1023,a[r++]=56320|1023&n)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(e=o.transformTo(h.uint8array?"uint8array":"array",e))},o.inherits(a,n),a.prototype.processChunk=function(e){var t=o.transformTo(h.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=t;(t=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),t.set(r,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var n=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}(t),i=t;n!==t.length&&(h.uint8array?(i=t.subarray(0,n),this.leftOver=t.subarray(n,t.length)):(i=t.slice(0,n),this.leftOver=t.slice(n,t.length))),this.push({data:s.utf8decode(i),meta:e.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(l,n),l.prototype.processChunk=function(e){this.push({data:s.utf8encode(e.data),meta:e.meta})},s.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,a){"use strict";var o=e("./support"),h=e("./base64"),r=e("./nodejsUtils"),u=e("./external");function n(e){return e}function l(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}e("setimmediate"),a.newBlob=function(t,r){a.checkSupport("blob");try{return new Blob([t],{type:r})}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(t),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var i={stringifyByChunk:function(e,t,r){var n=[],i=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;i<s;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+r,s)))):n.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+r,s)))),i+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(e){return!1}}()}};function s(e){var t=65536,r=a.getTypeOf(e),n=!0;if("uint8array"===r?n=i.applyCanBeUsed.uint8array:"nodebuffer"===r&&(n=i.applyCanBeUsed.nodebuffer),n)for(;1<t;)try{return i.stringifyByChunk(e,r,t)}catch(e){t=Math.floor(t/2)}return i.stringifyByChar(e)}function f(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}a.applyFromCharCode=s;var c={};c.string={string:n,array:function(e){return l(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return l(e,new Uint8Array(e.length))},nodebuffer:function(e){return l(e,r.allocBuffer(e.length))}},c.array={string:s,array:n,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(e)}},c.arraybuffer={string:function(e){return s(new Uint8Array(e))},array:function(e){return f(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:n,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:n,nodebuffer:function(e){return r.newBufferFrom(e)}},c.nodebuffer={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return f(e,new Uint8Array(e.length))},nodebuffer:n},a.transformTo=function(e,t){if(t=t||"",!e)return t;a.checkSupport(e);var r=a.getTypeOf(t);return c[r][e](t)},a.resolve=function(e){for(var t=e.split("/"),r=[],n=0;n<t.length;n++){var i=t[n];"."===i||""===i&&0!==n&&n!==t.length-1||(".."===i?r.pop():r.push(i))}return r.join("/")},a.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":o.nodebuffer&&r.isBuffer(e)?"nodebuffer":o.uint8array&&e instanceof Uint8Array?"uint8array":o.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(e){if(!o[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},a.delay=function(e,t,r){setImmediate(function(){e.apply(r||null,t||[])})},a.inherits=function(e,t){function r(){}r.prototype=t.prototype,e.prototype=new r},a.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},a.prepareContent=function(r,e,n,i,s){return u.Promise.resolve(e).then(function(n){return o.blob&&(n instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(n)))&&"undefined"!=typeof FileReader?new u.Promise(function(t,r){var e=new FileReader;e.onload=function(e){t(e.target.result)},e.onerror=function(e){r(e.target.error)},e.readAsArrayBuffer(n)}):n}).then(function(e){var t=a.getTypeOf(e);return t?("arraybuffer"===t?e=a.transformTo("uint8array",e):"string"===t&&(s?e=h.decode(e):n&&!0!==i&&(e=function(e){return l(e,o.uint8array?new Uint8Array(e.length):new Array(e.length))}(e))),e):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),i=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=e("./support");function h(e){this.files=[],this.loadOptions=e}h.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+i.pretty(t)+", expected "+i.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(0<n)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),s=e("./utils"),i=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),h=e("./compressions"),u=e("./support");function l(e,t){this.options=e,this.loadOptions=t}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in h)if(Object.prototype.hasOwnProperty.call(h,t)&&h[t].magic===e)return h[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==e&&(this.dosPermissions=63&this.externalFileAttributes),3==e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(e){var t,r,n,i=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<i;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(i)},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else{var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=l},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){"use strict";function n(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=e("./stream/StreamHelper"),i=e("./stream/DataWorker"),a=e("./utf8"),o=e("./compressedObject"),h=e("./stream/GenericWorker");n.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var i=!this._dataBinary;i&&!n&&(t=t.pipe(new a.Utf8EncodeWorker)),!i&&n&&(t=t.pipe(new a.Utf8DecodeWorker))}catch(e){(t=new h("error")).error(e)}return new s(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new i(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)n.prototype[u[f]]=l;t.exports=n},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,l,t){(function(t){"use strict";var r,n,e=t.MutationObserver||t.WebKitMutationObserver;if(e){var i=0,s=new e(u),a=t.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=i=++i%2}}else if(t.setImmediate||void 0===t.MessageChannel)r="document"in t&&"onreadystatechange"in t.document.createElement("script")?function(){var e=t.document.createElement("script");e.onreadystatechange=function(){u(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null},t.document.documentElement.appendChild(e)}:function(){setTimeout(u,0)};else{var o=new t.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0)}}var h=[];function u(){var e,t;n=!0;for(var r=h.length;r;){for(t=h,h=[],e=-1;++e<r;)t[e]();r=h.length}n=!1}l.exports=function(e){1!==h.push(e)||n||r()}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(e,t,r){"use strict";var i=e("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],n=["PENDING"];function o(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=n,this.queue=[],this.outcome=void 0,e!==u&&d(this,e)}function h(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(t,r,n){i(function(){var e;try{e=r(n)}catch(e){return l.reject(t,e)}e===t?l.reject(t,new TypeError("Cannot resolve promise with itself")):l.resolve(t,e)})}function c(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function d(t,e){var r=!1;function n(e){r||(r=!0,l.reject(t,e))}function i(e){r||(r=!0,l.resolve(t,e))}var s=p(function(){e(i,n)});"error"===s.status&&n(s.value)}function p(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}(t.exports=o).prototype.finally=function(t){if("function"!=typeof t)return this;var r=this.constructor;return this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})})},o.prototype.catch=function(e){return this.then(null,e)},o.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===s)return this;var r=new this.constructor(u);this.state!==n?f(r,this.state===a?e:t,this.outcome):this.queue.push(new h(r,e,t));return r},h.prototype.callFulfilled=function(e){l.resolve(this.promise,e)},h.prototype.otherCallFulfilled=function(e){f(this.promise,this.onFulfilled,e)},h.prototype.callRejected=function(e){l.reject(this.promise,e)},h.prototype.otherCallRejected=function(e){f(this.promise,this.onRejected,e)},l.resolve=function(e,t){var r=p(c,t);if("error"===r.status)return l.reject(e,r.value);var n=r.value;if(n)d(e,n);else{e.state=a,e.outcome=t;for(var i=-1,s=e.queue.length;++i<s;)e.queue[i].callFulfilled(t)}return e},l.reject=function(e,t){e.state=s,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},o.resolve=function(e){if(e instanceof this)return e;return l.resolve(new this(u),e)},o.reject=function(e){var t=new this(u);return l.reject(t,e)},o.all=function(e){var r=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var n=e.length,i=!1;if(!n)return this.resolve([]);var s=new Array(n),a=0,t=-1,o=new this(u);for(;++t<n;)h(e[t],t);return o;function h(e,t){r.resolve(e).then(function(e){s[t]=e,++a!==n||i||(i=!0,l.resolve(o,s))},function(e){i||(i=!0,l.reject(o,e))})}},o.race=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,n=!1;if(!r)return this.resolve([]);var i=-1,s=new this(u);for(;++i<r;)a=e[i],t.resolve(a).then(function(e){n||(n=!0,l.resolve(s,e))},function(e){n||(n=!0,l.reject(s,e))});var a;return s}},{immediate:36}],38:[function(e,t,r){"use strict";var n={};(0,e("./lib/utils/common").assign)(n,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=n},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){"use strict";var a=e("./zlib/deflate"),o=e("./utils/common"),h=e("./utils/strings"),i=e("./zlib/messages"),s=e("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,c=0,d=8;function p(e){if(!(this instanceof p))return new p(e);this.options=o.assign({level:f,method:d,chunkSize:16384,windowBits:15,memLevel:8,strategy:c,to:""},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(r!==l)throw new Error(i[r]);if(t.header&&a.deflateSetHeader(this.strm,t.header),t.dictionary){var n;if(n="string"==typeof t.dictionary?h.string2buf(t.dictionary):"[object ArrayBuffer]"===u.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(r=a.deflateSetDictionary(this.strm,n))!==l)throw new Error(i[r]);this._dict_set=!0}}function n(e,t){var r=new p(t);if(r.push(e,!0),r.err)throw r.msg||i[r.err];return r.result}p.prototype.push=function(e,t){var r,n,i=this.strm,s=this.options.chunkSize;if(this.ended)return!1;n=t===~~t?t:!0===t?4:0,"string"==typeof e?i.input=h.string2buf(e):"[object ArrayBuffer]"===u.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;do{if(0===i.avail_out&&(i.output=new o.Buf8(s),i.next_out=0,i.avail_out=s),1!==(r=a.deflate(i,n))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==i.avail_out&&(0!==i.avail_in||4!==n&&2!==n)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(i.output,i.next_out))):this.onData(o.shrinkBuf(i.output,i.next_out)))}while((0<i.avail_in||0===i.avail_out)&&1!==r);return 4===n?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==n||(this.onEnd(l),!(i.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e)},p.prototype.onEnd=function(e){e===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Deflate=p,r.deflate=n,r.deflateRaw=function(e,t){return(t=t||{}).raw=!0,n(e,t)},r.gzip=function(e,t){return(t=t||{}).gzip=!0,n(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){"use strict";var c=e("./zlib/inflate"),d=e("./utils/common"),p=e("./utils/strings"),m=e("./zlib/constants"),n=e("./zlib/messages"),i=e("./zlib/zstream"),s=e("./zlib/gzheader"),_=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=d.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new i,this.strm.avail_out=0;var r=c.inflateInit2(this.strm,t.windowBits);if(r!==m.Z_OK)throw new Error(n[r]);this.header=new s,c.inflateGetHeader(this.strm,this.header)}function o(e,t){var r=new a(t);if(r.push(e,!0),r.err)throw r.msg||n[r.err];return r.result}a.prototype.push=function(e,t){var r,n,i,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return!1;n=t===~~t?t:!0===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?h.input=p.binstring2buf(e):"[object ArrayBuffer]"===_.call(e)?h.input=new Uint8Array(e):h.input=e,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new d.Buf8(u),h.next_out=0,h.avail_out=u),(r=c.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=c.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||n!==m.Z_FINISH&&n!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(i=p.utf8border(h.output,h.next_out),s=h.next_out-i,a=p.buf2string(h.output,i),h.next_out=s,h.avail_out=u-s,s&&d.arraySet(h.output,h.output,i,s,0),this.onData(a)):this.onData(d.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0)}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(n=m.Z_FINISH),n===m.Z_FINISH?(r=c.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):n!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e)},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=d.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(e,t){return(t=t||{}).raw=!0,o(e,t)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n])}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,r,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),i);else for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){var t,r,n,i,s,a;for(t=n=0,r=e.length;t<r;t++)n+=e[t].length;for(a=new Uint8Array(n),t=i=0,r=e.length;t<r;t++)s=e[t],a.set(s,i),i+=s.length;return a}},s={arraySet:function(e,t,r,n,i){for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){return[].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,i)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(n)},{}],42:[function(e,t,r){"use strict";var h=e("./common"),i=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){i=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var u=new h.Buf8(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function l(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&i))return String.fromCharCode.apply(null,h.shrinkBuf(e,t));for(var r="",n=0;n<t;n++)r+=String.fromCharCode(e[n]);return r}u[254]=u[254]=1,r.string2buf=function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=new h.Buf8(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t},r.buf2binstring=function(e){return l(e,e.length)},r.binstring2buf=function(e){for(var t=new h.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,n,i,s,a=t||e.length,o=new Array(2*a);for(r=n=0;r<a;)if((i=e[r++])<128)o[n++]=i;else if(4<(s=u[i]))o[n++]=65533,r+=s-1;else{for(i&=2===s?31:3===s?15:7;1<s&&r<a;)i=i<<6|63&e[r++],s--;1<s?o[n++]=65533:i<65536?o[n++]=i:(i-=65536,o[n++]=55296|i>>10&1023,o[n++]=56320|1023&i)}return l(o,n)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}},{"./common":41}],43:[function(e,t,r){"use strict";t.exports=function(e,t,r,n){for(var i=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(i=i+t[n++]|0)|0,--a;);i%=65521,s%=65521}return i|s<<16|0}},{}],44:[function(e,t,r){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,r){"use strict";var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}},{}],46:[function(e,t,r){"use strict";var h,c=e("../utils/common"),u=e("./trees"),d=e("./adler32"),p=e("./crc32"),n=e("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,i=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(e,t){return e.msg=n[t],t}function T(e){return(e<<1)-(4<e?9:0)}function D(e){for(var t=e.length;0<=--t;)e[t]=0}function F(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(c.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function N(e,t){u._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,F(e.strm)}function U(e,t){e.pending_buf[e.pending++]=t}function P(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function L(e,t){var r,n,i=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,h=e.strstart>e.w_size-z?e.strstart-(e.w_size-z):0,u=e.window,l=e.w_mask,f=e.prev,c=e.strstart+S,d=u[s+a-1],p=u[s+a];e.prev_length>=e.good_match&&(i>>=2),o>e.lookahead&&(o=e.lookahead);do{if(u[(r=t)+a]===p&&u[r+a-1]===d&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<c);if(n=S-(c-s),s=c-S,a<n){if(e.match_start=t,o<=(a=n))break;d=u[s+a-1],p=u[s+a]}}}while((t=f[t&l])>h&&0!=--i);return a<=e.lookahead?a:e.lookahead}function j(e){var t,r,n,i,s,a,o,h,u,l,f=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=f+(f-z)){for(c.arraySet(e.window,e.window,f,f,0),e.match_start-=f,e.strstart-=f,e.block_start-=f,t=r=e.hash_size;n=e.head[--t],e.head[t]=f<=n?n-f:0,--r;);for(t=r=f;n=e.prev[--t],e.prev[t]=f<=n?n-f:0,--r;);i+=f}if(0===e.strm.avail_in)break;if(a=e.strm,o=e.window,h=e.strstart+e.lookahead,u=i,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,c.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=d(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),e.lookahead+=r,e.lookahead+e.insert>=x)for(s=e.strstart-e.insert,e.ins_h=e.window[s],e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+x-1])&e.hash_mask,e.prev[s&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=s,s++,e.insert--,!(e.lookahead+e.insert<x)););}while(e.lookahead<z&&0!==e.strm.avail_in)}function Z(e,t){for(var r,n;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r)),e.match_length>=x)if(n=u._tr_tally(e,e.strstart-e.match_start,e.match_length-x),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=x){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,0!=--e.match_length;);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function W(e,t){for(var r,n,i;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=x-1,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r),e.match_length<=5&&(1===e.strategy||e.match_length===x&&4096<e.strstart-e.match_start)&&(e.match_length=x-1)),e.prev_length>=x&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-x,n=u._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-x),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!=--e.prev_length;);if(e.match_available=0,e.match_length=x-1,e.strstart++,n&&(N(e,!1),0===e.strm.avail_out))return A}else if(e.match_available){if((n=u._tr_tally(e,0,e.window[e.strstart-1]))&&N(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return A}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=u._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function M(e,t,r,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=i}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new c.Buf16(2*w),this.dyn_dtree=new c.Buf16(2*(2*a+1)),this.bl_tree=new c.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new c.Buf16(k+1),this.heap=new c.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new c.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function G(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=i,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?C:E,e.adler=2===t.wrap?0:1,t.last_flush=l,u._tr_init(t),m):R(e,_)}function K(e){var t=G(e);return t===m&&function(e){e.window_size=2*e.w_size,D(e.head),e.max_lazy_match=h[e.level].max_lazy,e.good_match=h[e.level].good_length,e.nice_match=h[e.level].nice_length,e.max_chain_length=h[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=x-1,e.match_available=0,e.ins_h=0}(e.state),t}function Y(e,t,r,n,i,s){if(!e)return _;var a=1;if(t===g&&(t=6),n<0?(a=0,n=-n):15<n&&(a=2,n-=16),i<1||y<i||r!==v||n<8||15<n||t<0||9<t||s<0||b<s)return R(e,_);8===n&&(n=9);var o=new H;return(e.state=o).strm=e,o.wrap=a,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=i+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new c.Buf8(2*o.w_size),o.head=new c.Buf16(o.hash_size),o.prev=new c.Buf16(o.w_size),o.lit_bufsize=1<<i+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new c.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=r,K(e)}h=[new M(0,0,0,0,function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(j(e),0===e.lookahead&&t===l)return A;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,N(e,!1),0===e.strm.avail_out))return A;if(e.strstart-e.block_start>=e.w_size-z&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):(e.strstart>e.block_start&&(N(e,!1),e.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(e,t){return Y(e,t,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?_:(e.state.gzhead=t,m):_},r.deflate=function(e,t){var r,n,i,s;if(!e||!e.state||5<t||t<0)return e?R(e,_):_;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||666===n.status&&t!==f)return R(e,0===e.avail_out?-5:_);if(n.strm=e,r=n.last_flush,n.last_flush=t,n.status===C)if(2===n.wrap)e.adler=0,U(n,31),U(n,139),U(n,8),n.gzhead?(U(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),U(n,255&n.gzhead.time),U(n,n.gzhead.time>>8&255),U(n,n.gzhead.time>>16&255),U(n,n.gzhead.time>>24&255),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(U(n,255&n.gzhead.extra.length),U(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=p(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(U(n,0),U(n,0),U(n,0),U(n,0),U(n,0),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,3),n.status=E);else{var a=v+(n.w_bits-8<<4)<<8;a|=(2<=n.strategy||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(a|=32),a+=31-a%31,n.status=E,P(n,a),0!==n.strstart&&(P(n,e.adler>>>16),P(n,65535&e.adler)),e.adler=1}if(69===n.status)if(n.gzhead.extra){for(i=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending!==n.pending_buf_size));)U(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73)}else n.status=73;if(73===n.status)if(n.gzhead.name){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.gzindex=0,n.status=91)}else n.status=91;if(91===n.status)if(n.gzhead.comment){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.status=103)}else n.status=103;if(103===n.status&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&F(e),n.pending+2<=n.pending_buf_size&&(U(n,255&e.adler),U(n,e.adler>>8&255),e.adler=0,n.status=E)):n.status=E),0!==n.pending){if(F(e),0===e.avail_out)return n.last_flush=-1,m}else if(0===e.avail_in&&T(t)<=T(r)&&t!==f)return R(e,-5);if(666===n.status&&0!==e.avail_in)return R(e,-5);if(0!==e.avail_in||0!==n.lookahead||t!==l&&666!==n.status){var o=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(j(e),0===e.lookahead)){if(t===l)return A;break}if(e.match_length=0,r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):3===n.strategy?function(e,t){for(var r,n,i,s,a=e.window;;){if(e.lookahead<=S){if(j(e),e.lookahead<=S&&t===l)return A;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=x&&0<e.strstart&&(n=a[i=e.strstart-1])===a[++i]&&n===a[++i]&&n===a[++i]){s=e.strstart+S;do{}while(n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&i<s);e.match_length=S-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=x?(r=u._tr_tally(e,1,e.match_length-x),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):h[n.level].func(n,t);if(o!==O&&o!==B||(n.status=666),o===A||o===O)return 0===e.avail_out&&(n.last_flush=-1),m;if(o===I&&(1===t?u._tr_align(n):5!==t&&(u._tr_stored_block(n,0,0,!1),3===t&&(D(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),F(e),0===e.avail_out))return n.last_flush=-1,m}return t!==f?m:n.wrap<=0?1:(2===n.wrap?(U(n,255&e.adler),U(n,e.adler>>8&255),U(n,e.adler>>16&255),U(n,e.adler>>24&255),U(n,255&e.total_in),U(n,e.total_in>>8&255),U(n,e.total_in>>16&255),U(n,e.total_in>>24&255)):(P(n,e.adler>>>16),P(n,65535&e.adler)),F(e),0<n.wrap&&(n.wrap=-n.wrap),0!==n.pending?m:1)},r.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==C&&69!==t&&73!==t&&91!==t&&103!==t&&t!==E&&666!==t?R(e,_):(e.state=null,t===E?R(e,-3):m):_},r.deflateSetDictionary=function(e,t){var r,n,i,s,a,o,h,u,l=t.length;if(!e||!e.state)return _;if(2===(s=(r=e.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(e.adler=d(e.adler,t,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new c.Buf8(r.w_size),c.arraySet(u,t,l-r.w_size,r.w_size,0),t=u,l=r.w_size),a=e.avail_in,o=e.next_in,h=e.input,e.avail_in=l,e.next_in=0,e.input=t,j(r);r.lookahead>=x;){for(n=r.strstart,i=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+x-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++,--i;);r.strstart=n,r.lookahead=x-1,j(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,e.next_in=o,e.input=h,e.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(e,t,r){"use strict";t.exports=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C;r=e.state,n=e.next_in,z=e.input,i=n+(e.avail_in-5),s=e.next_out,C=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,c=r.window,d=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;e:do{p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=m[d&g];t:for(;;){if(d>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else{if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(d&(1<<y)-1)];continue t}if(32&y){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}w=65535&v,(y&=15)&&(p<y&&(d+=z[n++]<<p,p+=8),w+=d&(1<<y)-1,d>>>=y,p-=y),p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=_[d&b];r:for(;;){if(d>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(d&(1<<y)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&v,p<(y&=15)&&(d+=z[n++]<<p,(p+=8)<y&&(d+=z[n++]<<p,p+=8)),h<(k+=d&(1<<y)-1)){e.msg="invalid distance too far back",r.mode=30;break e}if(d>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(S=c,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=c[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=c[x++],--y;);x=s-k,S=C}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]))}else{for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]))}break}}break}}while(n<i&&s<o);n-=w=p>>3,d&=(1<<(p-=w<<3))-1,e.next_in=n,e.next_out=s,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=d,r.bits=p}},{}],49:[function(e,t,r){"use strict";var I=e("../utils/common"),O=e("./adler32"),B=e("./crc32"),R=e("./inffast"),T=e("./inftrees"),D=1,F=2,N=0,U=-2,P=1,n=852,i=592;function L(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=P,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new I.Buf32(n),t.distcode=t.distdyn=new I.Buf32(i),t.sane=1,t.back=-1,N):U}function o(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):U}function h(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,o(e))):U}function u(e,t){var r,n;return e?(n=new s,(e.state=n).window=null,(r=h(e,t))!==N&&(e.state=null),r):U}var l,f,c=!0;function j(e){if(c){var t;for(l=new I.Buf32(512),f=new I.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(T(D,e.lens,0,288,l,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;T(F,e.lens,0,32,f,0,e.work,{bits:5}),c=!1}e.lencode=l,e.lenbits=9,e.distcode=f,e.distbits=5}function Z(e,t,r,n){var i,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),n>=s.wsize?(I.arraySet(s.window,t,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(n<(i=s.wsize-s.wnext)&&(i=n),I.arraySet(s.window,t,r-n,i,s.wnext),(n-=i)?(I.arraySet(s.window,t,r-n,n,0),s.wnext=n,s.whave=s.wsize):(s.wnext+=i,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=i))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(e){return u(e,15)},r.inflateInit2=u,r.inflate=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(r=e.state).mode&&(r.mode=13),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,f=o,c=h,x=N;e:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){e.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){e.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){e.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,e.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.flags=u,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(d=r.length)&&(d=o),d&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,n,s,d,k)),512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,r.length-=d),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(65535&r.check)){e.msg="header crc mismatch",r.mode=30;break}l=u=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}e.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,2;e.adler=r.check=1,r.mode=12;case 12:if(5===t||6===t)break e;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==t)break;u>>>=2,l-=2;break e;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=30}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if((65535&u)!=(u>>>16^65535)){e.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(d=r.length){if(o<d&&(d=o),h<d&&(d=h),0===d)break e;I.arraySet(i,n,s,d,a),o-=d,s+=d,h-=d,a+=d,r.length-=d;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){e.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else{if(16===b){for(z=_+2;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u>>>=_,l-=_,0===r.have){e.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],d=3+(3&u),u>>>=2,l-=2}else if(17===b){for(z=_+3;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=3+(7&(u>>>=_)),u>>>=3,l-=3}else{for(z=_+7;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=11+(127&(u>>>=_)),u>>>=7,l-=7}if(r.have+d>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=30;break}for(;d--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){e.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(6<=o&&258<=h){e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,R(e,c),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){e.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,64&g){e.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break e;if(d=c-h,r.offset>d){if((d=r.offset-d)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=30;break}p=d>r.wnext?(d-=r.wnext,r.wsize-d):r.wnext-d,d>r.length&&(d=r.length),m=r.window}else m=i,p=a-r.offset,d=r.length;for(h<d&&(d=h),h-=d,r.length-=d;i[a++]=m[p++],--d;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break e;i[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break e;o--,u|=n[s++]<<l,l+=8}if(c-=h,e.total_out+=c,r.total+=c,c&&(e.adler=r.check=r.flags?B(r.check,i,c,a-c):O(r.check,i,c,a-c)),c=h,(r.flags?u:L(u))!==r.check){e.msg="incorrect data check",r.mode=30;break}l=u=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=30;break}l=u=0}r.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return-4;case 32:default:return U}return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,(r.wsize||c!==e.avail_out&&r.mode<30&&(r.mode<27||4!==t))&&Z(e,e.output,e.next_out,c-e.avail_out)?(r.mode=31,-4):(f-=e.avail_in,c-=e.avail_out,e.total_in+=f,e.total_out+=c,r.total+=c,r.wrap&&c&&(e.adler=r.check=r.flags?B(r.check,i,c,e.next_out-c):O(r.check,i,c,e.next_out-c)),e.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===c||4===t)&&x===N&&(x=-5),x)},r.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,N},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?U:((r.head=t).done=!1,N):U},r.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,t,n,0)!==r.check?-3:Z(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){"use strict";var D=e("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,n,i,s,a,o){var h,u,l,f,c,d,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<n;v++)O[t[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return i[s++]=20971520,i[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return-1;if(0<z&&(0===e||1!==w))return-1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<n;v++)0!==t[r+v]&&(a[B[t[r+v]]++]=v);if(d=0===e?(A=R=a,19):1===e?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,c=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===e&&852<C||2===e&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<d?(m=0,a[v]):a[v]>d?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;i[c+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=t[r+a[v]]}if(k<b&&(E&f)!==l){for(0===S&&(S=k),c+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===e&&852<C||2===e&&592<C)return 1;i[l=E&f]=k<<24|x<<16|c-s|0}}return 0!==E&&(i[c+E]=b-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(e,t,r){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(e,t,r){"use strict";var i=e("../utils/common"),o=0,h=1;function n(e){for(var t=e.length;0<=--t;)e[t]=0}var s=0,a=29,u=256,l=u+1+a,f=30,c=19,_=2*l+1,g=15,d=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));n(z);var C=new Array(2*f);n(C);var E=new Array(512);n(E);var A=new Array(256);n(A);var I=new Array(a);n(I);var O,B,R,T=new Array(f);function D(e,t,r,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=i,this.has_stree=e&&e.length}function F(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function N(e){return e<256?E[e]:E[256+(e>>>7)]}function U(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function P(e,t,r){e.bi_valid>d-r?(e.bi_buf|=t<<e.bi_valid&65535,U(e,e.bi_buf),e.bi_buf=t>>d-e.bi_valid,e.bi_valid+=r-d):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function L(e,t,r){P(e,r[2*t],r[2*t+1])}function j(e,t){for(var r=0;r|=1&e,e>>>=1,r<<=1,0<--t;);return r>>>1}function Z(e,t,r){var n,i,s=new Array(g+1),a=0;for(n=1;n<=g;n++)s[n]=a=a+r[n-1]<<1;for(i=0;i<=t;i++){var o=e[2*i+1];0!==o&&(e[2*i]=j(s[o]++,o))}}function W(e){var t;for(t=0;t<l;t++)e.dyn_ltree[2*t]=0;for(t=0;t<f;t++)e.dyn_dtree[2*t]=0;for(t=0;t<c;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*m]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function M(e){8<e.bi_valid?U(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function H(e,t,r,n){var i=2*t,s=2*r;return e[i]<e[s]||e[i]===e[s]&&n[t]<=n[r]}function G(e,t,r){for(var n=e.heap[r],i=r<<1;i<=e.heap_len&&(i<e.heap_len&&H(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!H(t,n,e.heap[i],e.depth));)e.heap[r]=e.heap[i],r=i,i<<=1;e.heap[r]=n}function K(e,t,r){var n,i,s,a,o=0;if(0!==e.last_lit)for(;n=e.pending_buf[e.d_buf+2*o]<<8|e.pending_buf[e.d_buf+2*o+1],i=e.pending_buf[e.l_buf+o],o++,0===n?L(e,i,t):(L(e,(s=A[i])+u+1,t),0!==(a=w[s])&&P(e,i-=I[s],a),L(e,s=N(--n),r),0!==(a=k[s])&&P(e,n-=T[s],a)),o<e.last_lit;);L(e,m,t)}function Y(e,t){var r,n,i,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,h=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(e.heap[++e.heap_len]=u=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(i=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[i]=0,e.opt_len--,o&&(e.static_len-=a[2*i+1]);for(t.max_code=u,r=e.heap_len>>1;1<=r;r--)G(e,s,r);for(i=h;r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],G(e,s,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,s[2*i]=s[2*r]+s[2*n],e.depth[i]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,s[2*r+1]=s[2*n+1]=i,e.heap[1]=i++,G(e,s,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,i,s,a,o,h=t.dyn_tree,u=t.max_code,l=t.stat_desc.static_tree,f=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,p=t.stat_desc.max_length,m=0;for(s=0;s<=g;s++)e.bl_count[s]=0;for(h[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<_;r++)p<(s=h[2*h[2*(n=e.heap[r])+1]+1]+1)&&(s=p,m++),h[2*n+1]=s,u<n||(e.bl_count[s]++,a=0,d<=n&&(a=c[n-d]),o=h[2*n],e.opt_len+=o*(s+a),f&&(e.static_len+=o*(l[2*n+1]+a)));if(0!==m){do{for(s=p-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(n=e.bl_count[s];0!==n;)u<(i=e.heap[--r])||(h[2*i+1]!==s&&(e.opt_len+=(s-h[2*i+1])*h[2*i],h[2*i+1]=s),n--)}}(e,t),Z(s,u,e.bl_count)}function X(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)i=a,a=t[2*(n+1)+1],++o<h&&i===a||(o<u?e.bl_tree[2*i]+=o:0!==i?(i!==s&&e.bl_tree[2*i]++,e.bl_tree[2*b]++):o<=10?e.bl_tree[2*v]++:e.bl_tree[2*y]++,s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4))}function V(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),n=0;n<=r;n++)if(i=a,a=t[2*(n+1)+1],!(++o<h&&i===a)){if(o<u)for(;L(e,i,e.bl_tree),0!=--o;);else 0!==i?(i!==s&&(L(e,i,e.bl_tree),o--),L(e,b,e.bl_tree),P(e,o-3,2)):o<=10?(L(e,v,e.bl_tree),P(e,o-3,3)):(L(e,y,e.bl_tree),P(e,o-11,7));s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4)}}n(T);var q=!1;function J(e,t,r,n){P(e,(s<<1)+(n?1:0),3),function(e,t,r,n){M(e),n&&(U(e,r),U(e,~r)),i.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r}(e,t,r,!0)}r._tr_init=function(e){q||(function(){var e,t,r,n,i,s=new Array(g+1);for(n=r=0;n<a-1;n++)for(I[n]=r,e=0;e<1<<w[n];e++)A[r++]=n;for(A[r-1]=n,n=i=0;n<16;n++)for(T[n]=i,e=0;e<1<<k[n];e++)E[i++]=n;for(i>>=7;n<f;n++)for(T[n]=i<<7,e=0;e<1<<k[n]-7;e++)E[256+i++]=n;for(t=0;t<=g;t++)s[t]=0;for(e=0;e<=143;)z[2*e+1]=8,e++,s[8]++;for(;e<=255;)z[2*e+1]=9,e++,s[9]++;for(;e<=279;)z[2*e+1]=7,e++,s[7]++;for(;e<=287;)z[2*e+1]=8,e++,s[8]++;for(Z(z,l+1,s),e=0;e<f;e++)C[2*e+1]=5,C[2*e]=j(e,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,c,p)}(),q=!0),e.l_desc=new F(e.dyn_ltree,O),e.d_desc=new F(e.dyn_dtree,B),e.bl_desc=new F(e.bl_tree,R),e.bi_buf=0,e.bi_valid=0,W(e)},r._tr_stored_block=J,r._tr_flush_block=function(e,t,r,n){var i,s,a=0;0<e.level?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return o;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return h;for(t=32;t<u;t++)if(0!==e.dyn_ltree[2*t])return h;return o}(e)),Y(e,e.l_desc),Y(e,e.d_desc),a=function(e){var t;for(X(e,e.dyn_ltree,e.l_desc.max_code),X(e,e.dyn_dtree,e.d_desc.max_code),Y(e,e.bl_desc),t=c-1;3<=t&&0===e.bl_tree[2*S[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),i=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=i&&(i=s)):i=s=r+5,r+4<=i&&-1!==t?J(e,t,r,n):4===e.strategy||s===i?(P(e,2+(n?1:0),3),K(e,z,C)):(P(e,4+(n?1:0),3),function(e,t,r,n){var i;for(P(e,t-257,5),P(e,r-1,5),P(e,n-4,4),i=0;i<n;i++)P(e,e.bl_tree[2*S[i]+1],3);V(e,e.dyn_ltree,t-1),V(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),K(e,e.dyn_ltree,e.dyn_dtree)),W(e),n&&M(e)},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(A[r]+u+1)]++,e.dyn_dtree[2*N(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){P(e,2,3),L(e,m,z),function(e){16===e.bi_valid?(U(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):8<=e.bi_valid&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},{"../utils/common":41}],53:[function(e,t,r){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,r){(function(e){!function(r,n){"use strict";if(!r.setImmediate){var i,s,t,a,o=1,h={},u=!1,l=r.document,e=Object.getPrototypeOf&&Object.getPrototypeOf(r);e=e&&e.setTimeout?e:r,i="[object process]"==={}.toString.call(r.process)?function(e){process.nextTick(function(){c(e)})}:function(){if(r.postMessage&&!r.importScripts){var e=!0,t=r.onmessage;return r.onmessage=function(){e=!1},r.postMessage("","*"),r.onmessage=t,e}}()?(a="setImmediate$"+Math.random()+"$",r.addEventListener?r.addEventListener("message",d,!1):r.attachEvent("onmessage",d),function(e){r.postMessage(a+e,"*")}):r.MessageChannel?((t=new MessageChannel).port1.onmessage=function(e){c(e.data)},function(e){t.port2.postMessage(e)}):l&&"onreadystatechange"in l.createElement("script")?(s=l.documentElement,function(e){var t=l.createElement("script");t.onreadystatechange=function(){c(e),t.onreadystatechange=null,s.removeChild(t),t=null},s.appendChild(t)}):function(e){setTimeout(c,0,e)},e.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),r=0;r<t.length;r++)t[r]=arguments[r+1];var n={callback:e,args:t};return h[o]=n,i(o),o++},e.clearImmediate=f}function f(e){delete h[e]}function c(e){if(u)setTimeout(c,0,e);else{var t=h[e];if(t){u=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(n,r)}}(t)}finally{f(e),u=!1}}}}function d(e){e.source===r&&"string"==typeof e.data&&0===e.data.indexOf(a)&&c(+e.data.slice(a.length))}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[10])(10)});


(function (JSZip) {
  'use strict';

  /**
   * @file Image pool and face detection configuration.
   * @module config/pool
   */

  // Image pool configuration
  const IMAGE_POOL_CONFIG = {
    /** Maximum number of images the user can store */
    MAX_IMAGES: 50,

    // ---- Standard output ----
    /** Output width (all stored images are forced to this) */
    OUTPUT_WIDTH: 400,
    /** Output height (all stored images are forced to this) */
    OUTPUT_HEIGHT: 300,
    /** Maximum pixel dimension (width or height) for stored images — keeps aspect ratio */
    MAX_DIMENSION: 800,
    /** JPEG export quality (0.0 – 1.0) for storage */
    JPEG_QUALITY: 0.78,

    // ---- Original image compression (kept for crop editing) ----
    /** Max pixel dimension for stored originals — keeps file size under quota */
    ORIG_MAX_DIMENSION: 1200,
    /** JPEG quality for stored originals (aggressive to save quota) */
    ORIG_JPEG_QUALITY: 0.65,

    // ---- Upload guards ----
    /** Accepted MIME types for upload */
    ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'],
    /** Maximum file size before compression (bytes) — reject larger files upfront */
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB

    // ---- Dedup ----
    /** dHash Hamming-distance threshold: ≤ this value → considered duplicate */
    DEDUP_HAMMING_THRESHOLD: 8,

    // ---- Mutation (applied at pick-time, never alters stored originals) ----
    /** Probability that mutation is enabled at all per pick */
    MUTATION_ENABLED: true,
    /** Per-mutation activation chances (0–1).  ~2–5 mutations fire per pick. */
    MUTATION_CHANCE_BRIGHTNESS: 0.40,
    MUTATION_CHANCE_CONTRAST: 0.35,
    MUTATION_CHANCE_SATURATION: 0.30,
    MUTATION_CHANCE_HUE: 0.15,
    MUTATION_CHANCE_FLIP: 0,
    MUTATION_CHANCE_ROTATE: 0.45,
    MUTATION_CHANCE_SCALE_JITTER: 0.30,
    /** Ranges */
    MUTATION_BRIGHTNESS_RANGE: [0.85, 1.15],   // multiplier
    MUTATION_CONTRAST_RANGE:   [0.88, 1.12],
    MUTATION_SATURATION_RANGE: [0.85, 1.15],
    MUTATION_HUE_RANGE:        [-4, 4],         // degrees
    MUTATION_ROTATE_RANGE:     [-2.5, 2.5],     // degrees
    MUTATION_SCALE_RANGE:      [1.0, 1.06],     // multiplier per axis (floor ≥ 1.0 prevents black borders)
    /** JPEG quality range for mutated output */
    MUTATION_QUALITY_RANGE:    [0.72, 0.85],

    // ---- Quality scoring (weighted random selection) ----
    /**
     * Per-image usage stats are persisted separately (bfw_img_stats) and
     * drive a weighted random selection algorithm.  High-quality images
     * get boosted probability; low-quality images are down-weighted but
     * never fully excluded — every image always has a non-zero chance.
     */
    QUALITY_SCORING: {
      /** Minimum uses before quality tier can drop below neutral */
      MIN_USES_FOR_ASSESSMENT: 3,
      /** Minimum failure count before an image can be classified as low-quality */
      LOW_QUALITY_FAILURE_THRESHOLD: 3,
      /** Failure rate (failures / totalUses) at or above this value → low quality */
      LOW_QUALITY_FAIL_RATE: 0.5,
      /** Success rate at or above this → high quality (requires enough uses) */
      HIGH_QUALITY_SUCCESS_RATE: 0.7,
      /** Minimum uses before an image can be classified as high-quality */
      HIGH_QUALITY_MIN_USES: 5,
      /** Weight multiplier for low-quality images (0.15 = 15% of neutral) */
      LOW_QUALITY_WEIGHT: 0.15,
      /** Weight multiplier for neutral / new images (baseline) */
      NEUTRAL_WEIGHT: 1.0,
      /** Weight multiplier for high-quality images */
      HIGH_QUALITY_WEIGHT: 2.5,
    },

    // ---- No-repeat: avoid reusing successfully-verified faces ----
    /**
     * When enabled, images that recently passed face verification are excluded
     * from subsequent picks so the same face isn't sent twice in a row.
     *
     * Edge case handling:
     *  - If ALL pool images are excluded (tiny pool, e.g. 1–2 images), fall
     *    back to the full pool with a debug-level log entry.
     *  - If an excluded image is removed from the pool, its exclusion is
     *    automatically cleaned up.
     */
    NO_REPEAT_ENABLED: true,
    /**
     * Exclusion scope:
     *  - 'session': exclude ALL images that succeeded during the current page
     *    session.  Best for long courses with many verification checkpoints —
     *    each face is used at most once per session.
     *  - 'last': exclude only the SINGLE most-recently-successful image.
     *    Safer for tiny pools (2–3 images) where session mode would exhaust
     *    the pipeline too quickly.
     */
    NO_REPEAT_MODE: 'session',

    // ---- Storage ----
    /** Storage key prefix (shared across all storage backends) */
    STORAGE_KEY_PREFIX: 'bfw_img_',
    /** Metadata key */
    META_KEY: 'bfw_meta',
    /** Stats key for per-image quality tracking */
    STATS_KEY: 'bfw_img_stats',
  };

  // Face detection (smart crop) configuration
  const FACE_DETECT_CONFIG = {
    // ---- Tier 1: Skin-color heuristic ----
    /**
     * Downsample size for skin-color analysis (pixels on longest side).
     * Increased from 80→100 for ~56% more skin-pixel samples at negligible
     * cost (~1ms extra on a 100×75 downscaled canvas).
     */
    SKIN_SAMPLE_SIZE: 100,

    /**
     * Minimum skin-pixel count for the heuristic to be considered valid.
     * Scaled proportionally from 50→80 to match the larger sample canvas.
     */
    SKIN_MIN_PIXELS: 80,

    /** YCbCr skin-pixel thresholds (ITU-R BT.601, illumination-invariant) */
    SKIN_CB_MIN: 77,
    SKIN_CB_MAX: 127,
    SKIN_CR_MIN: 133,
    SKIN_CR_MAX: 173,

    // ---- Component analysis (P0 backbone) ----
    /**
     * Minimum absolute skin pixels for a connected component to be considered
     * as a face candidate on the downsampled canvas.
     */
    SKIN_COMPONENT_MIN_PIXELS: 60,
    /**
     * Minimum component area ratio relative to the downsampled sample canvas.
     * Rejects tiny blobs even when the absolute pixel threshold is permissive.
     */
    SKIN_COMPONENT_MIN_AREA_RATIO: 0.01,
    /**
     * Broad aspect-ratio guard for candidate components before final trimming.
     * Kept generous so slightly tilted or off-angle faces still survive.
     */
    SKIN_COMPONENT_MIN_ASPECT_RATIO: 0.55,
    SKIN_COMPONENT_MAX_CANDIDATE_ASPECT_RATIO: 2.2,
    /** Typical face height/width ratio used by the component scorer. */
    SKIN_COMPONENT_IDEAL_ASPECT_RATIO: 1.18,
    /**
     * Target area ratio for the area score.  Larger components saturate the
     * score instead of dominating purely by size.
     */
    SKIN_COMPONENT_TARGET_AREA_RATIO: 0.10,
    /**
     * Edge-density guards for rejecting smooth, skin-coloured background
     * regions such as cabinets or walls.
     */
    SKIN_COMPONENT_MIN_EDGE_RATIO: 0.012,
    SKIN_COMPONENT_HARD_MIN_EDGE_RATIO: 0.006,
    /**
     * Best-candidate confidence gates.  When the top component is weak or the
     * top two are too close, the heuristic falls back to the fixed crop bias.
     */
    SKIN_COMPONENT_SCORE_THRESHOLD: 2.35,
    SKIN_COMPONENT_MIN_SCORE_MARGIN: 0.18,
    /** Component scorer weights. */
    SKIN_SCORE_WEIGHT_AREA: 0.90,
    SKIN_SCORE_WEIGHT_VERTICAL: 0.85,
    SKIN_SCORE_WEIGHT_EDGE: 1.35,
    SKIN_SCORE_WEIGHT_ASPECT: 0.85,
    SKIN_SCORE_WEIGHT_SHARE: 0.45,
    SKIN_SCORE_WEIGHT_TAPER: 0.35,

    // ---- Layer 1: Vertical position prior ----
    /**
     * Skin pixels in the upper portion of the image are weighted more
     * heavily because faces nearly always appear in the upper half of
     * portrait photos.  This naturally biases the detected region's
     * center of mass away from the neck.
     *
     * Weight formula:  1.0 − decay × (row / maxRow)
     * Top row gets 1.0×, bottom row gets (1.0 − decay)×.
     */
    SKIN_VERTICAL_WEIGHT_ENABLED: true,
    /** At 0.45 the bottom row gets 0.55× the weight of the top row. */
    SKIN_VERTICAL_WEIGHT_DECAY: 0.45,

    // ---- Layer 3: Edge-density bonus ----
    /**
     * Faces contain high-contrast features (eyes, brows, nostrils, mouth)
     * that create sharp luminance edges.  Necks are comparatively smooth.
     * Adding a small bonus to skin pixels near luminance edges shifts
     * density mass toward the face and away from the neck.
     *
     * For each skin pixel we compare its luminance with its right-hand
     * neighbour; if the difference exceeds the threshold we add the bonus
     * weight to that pixel's grid cell.
     */
    SKIN_EDGE_BONUS_ENABLED: true,
    /** Weight added to a skin pixel's grid cell when an edge is detected. */
    SKIN_EDGE_BONUS_WEIGHT: 0.30,
    /** Luminance difference (> this) between adjacent pixels → edge.
     *  Typical face features produce step edges of 40–80 luma units;
     *  smooth skin varies by <10.  A threshold of 20 reliably separates
     *  facial features from uniform neck skin. */
    SKIN_EDGE_LUM_THRESHOLD: 20,

    /**
     * Minimum relative drop between consecutive rows to be considered a
     * face→neck cliff.  0.40 = row below has ≤60% of the skin pixels.
     */
    SKIN_CLIFF_THRESHOLD: 0.40,

    // ---- Layer 5: Aspect ratio sanity ----
    /**
     * A purely-skin-based face box that's much taller than wide almost
     * certainly includes neck.  Clamp height to this ratio.
     * 1.4:1 is generous for oval faces — a typical face is 1.0–1.3:1
     * (height/width).  Anything taller gets bottom-trimmed.
     */
    SKIN_MAX_ASPECT_RATIO: 1.4,

    // ---- Headroom extension ----
    /**
     * The skin heuristic detects the FACE (roughly hairline to chin).
     * The hair and crown extend above the hairline by 25–38% of face
     * height (anthropometric average ~33%).  This shift re-positions the
     * attention point upward by a fraction of the detected face height
     * so the crop window includes the full head, not just the face.
     *
     * General anthropometric data:
     *   Face (hairline→chin) = ~60–65% of total head
     *   Hair/crown above hairline = ~35–40% of face height
     *   User measurement: hair 60px : face 160px → 0.375 ratio
     *
     * 0.24 × faceH shifts the centroid from the skin centre (roughly
     * nose bridge) up toward the hairline/crown so the crop window
     * includes the full head with comfortable headroom.
     */
    SKIN_HEADROOM_SHIFT: 0.24,

    // ---- Tier 2: Fixed-bias fallback ----
    /**
     * Vertical bias when no skin regions are detected by the heuristic.
     * Same value as IMAGE_POOL_CONFIG.CROP_FACE_BIAS — kept here as the
     * canonical source for the face-detection pipeline.
     */
    CROP_FALLBACK_BIAS: 0.38,

    /**
     * Vertical bias used when skin detection succeeds.
     * 0.40 = attention point at 40% from top → more headroom above than
     * below.  Combined with the headroom shift on the centroid, this
     * ensures the full head (face + hair) is visible in the 4:3 crop.
     */
    CROP_FACE_BIAS: 0.40,
  };

  // Crop editor configuration
  const CROP_EDITOR_CONFIG = {
    /** Maximum displayed width/height in the editor (px) — image is scaled to fit */
    MAX_DISPLAY_SIZE: 480,
    /** Handle radius for interaction hit-testing (px) */
    HANDLE_RADIUS: 10,
    /** Handle visual size in CSS (px) */
    HANDLE_SIZE: 12,
    /** Minimum crop rectangle size in source pixels */
    MIN_CROP_PX: 20,
    /** Target aspect ratio (width / height) */
    TARGET_RATIO: 4 / 3,
    /** Live preview thumbnail size (px, square bounding box) */
    PREVIEW_SIZE: 72,
  };

  /**
   * @file Media configuration — video stream replacement, frame capture, and overlay.
   * @module config/media
   */

  // Video stream replacement configuration
  const VIDEO_REPLACE_CONFIG = {
    /** Default canvas width when constraints don't specify */
    DEFAULT_WIDTH: 640,
    /** Default canvas height when constraints don't specify */
    DEFAULT_HEIGHT: 480,
    /** Canvas stream FPS */
    STREAM_FPS: 30,
    /** Subtle brightness jitter range (±this fraction) to simulate live camera */
    BRIGHTNESS_JITTER: 0.02,
  };

  // Video frame capture selectors (for manual "capture" button)
  const VIDEO_CAPTURE_SELECTORS = ['#video', '.main_content', 'video[autoplay]', 'video'];

  /**
   * @file Core configuration constants for baifenwang-auto-study.
   *
   * Domain-specific configs are in config/pool.js and config/media.js.
   */

  // Script metadata
  const SCRIPT_NAME = '百分网自动刷课助手';
  const SCRIPT_VERSION = '1.3.0';
  const GITHUB_URL = 'https://github.com/TheSkyC/baifenwang-auto-study';
  const UPDATE_API_URL = 'https://baifenwang-auto-study.tarxf.com';

  // Log level
  const LOG_LEVEL = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  // Current log level (change to LOG_LEVEL.DEBUG for verbose output)
  const CURRENT_LOG_LEVEL = LOG_LEVEL.INFO;

  // Settings storage key (shared across GM, localStorage, and in-memory backends)
  const SETTINGS_KEY = 'bfw_settings';

  // Progress tracker storage key
  const PROGRESS_TRACKER_KEY = 'bfw_progress';

  // Progress tracker behavior thresholds
  const PROGRESS_TRACKER_CONFIG = {
    /** Sessions shorter than this (seconds) with 0 lessons completed are discarded on end. */
    MIN_SESSION_DURATION_S: 30,
    /** Unfinished sessions older than this (ms) are not resumed — treated as abandoned. */
    RESUME_MAX_AGE_MS: 4 * 60 * 60 * 1000,  // 4 hours
  };

  // Import / export constants
  const IMPORT_EXPORT_CONFIG = {
    /** Current backup format version. Increment when the ZIP layout changes. */
    FORMAT_VERSION: 1,
    /** Estimated average cropped JPEG size for file-size prediction (bytes). */
    EST_CROPPED_JPEG_SIZE: 50 * 1024,   // 50 KB
    /** Estimated average original JPEG size for file-size prediction (bytes). */
    EST_ORIG_JPEG_SIZE: 100 * 1024,     // 100 KB
    /** Per-image JSON overhead in pool-meta.json + pool-stats.json (bytes). */
    EST_PER_IMAGE_JSON: 400,
  };

  // Retry settings for auto-processor
  const AUTO_CONFIG = {
    /** Delay before initial sequence kickoff (ms) */
    CLICK_DELAY_MS: 300,
    /** Delay after clicking "open camera" before trying the photo button (ms) */
    CAMERA_OPEN_DELAY_MS: 1500,
    /** Delay after clicking "take photo" before trying the compare button (ms) */
    PHOTO_DELAY_MS: 1000,
    /** Max retries when compare button is not yet in the DOM */
    MAX_COMPARE_RETRIES: 5,
    /** Retry interval for compare button polling (ms) */
    COMPARE_RETRY_DELAY_MS: 400,
    /** Max consecutive retry-button cycles before giving up */
    RETRY_MAX_ATTEMPTS: 5,
    /** Base delay for exponential backoff on retry (ms) */
    RETRY_BASE_DELAY_MS: 2000,
    /** Maximum backoff delay cap (ms) */
    RETRY_MAX_DELAY_MS: 30000,
    /** Minimum wait after clicking "开始对比" before handleCompareFailRecovery
     *  may fire.  The server needs time to respond; without this cooldown any
     *  DOM mutation during the server round-trip is misidentified as a failure
     *  because the page still shows both "重新拍照" and "开始对比" buttons.
     *
     *  Fixed per attempt — server response time doesn't change between retries.
     *  The retry gap (COMPARE_RETRY_GAP_BASE_MS) handles pacing between attempts;
     *  this only covers the ambiguous "still waiting or already rejected?" window. */
    COMPARE_COOLDOWN_MS: 8000,
    /** Base retry gap after a confirmed compare failure, before the retake cycle
     *  begins (ms).  Grows exponentially: base × 2^(compareAttempts-1), capped by
     *  COMPARE_RETRY_GAP_MAX_MS.
     *
     *  Separate from COMPARE_COOLDOWN_MS — the cooldown waits for the server to
     *  respond; the gap paces the cycle after failure is confirmed.  Using a
     *  shorter base with a moderate cap keeps the overall pace brisk even when
     *  verification fails several times in a row. */
    COMPARE_RETRY_GAP_BASE_MS: 2000,
    /** Maximum retry gap cap for exponential backoff (ms). */
    COMPARE_RETRY_GAP_MAX_MS: 15000,
    /** Delay after clicking retry button before camera-open click (ms).
     *  Used by onRetry() as a bridge between retry and the normal pipeline. */
    RETRY_CAMERA_DELAY_MS: 800,
  };

  // Auto-course (自动刷课) configuration
  const COURSE_CONFIG = {
    /** Delay before clicking the play button after page load (ms) */
    PLAY_CLICK_DELAY_MS: 1000,
    /** Max retries for finding and clicking the play button */
    PLAY_MAX_RETRIES: 10,
    /** Retry interval for play button polling (ms) */
    PLAY_RETRY_DELAY_MS: 500,
    /** How often to update the progress display (ms) */
    PROGRESS_UPDATE_INTERVAL_MS: 3000,
    /** Seconds of paused playback before auto-resuming */
    STUCK_THRESHOLD_S: 30,
    /** Max auto-resume attempts before giving up */
    MAX_RESUME_ATTEMPTS: 3};

  // ---------------------------------------------------------------------------
  // Delay jitter — prevents bot-detection via fixed-interval timing analysis.
  // Human reaction times have a coefficient of variation (CV) in the 0.3–0.8
  // range; fixed delays are CV=0.  Apply jitter at every usage site so the
  // timing fingerprint becomes unpredictable.
  // ---------------------------------------------------------------------------

  /**
   * Apply symmetric random jitter to a base delay.
   * Returns `baseMs * (1 ± factor)` — the delay can be SHORTER or LONGER.
   * Suitable for click delays, polling intervals, and general wait times.
   *
   * @param {number} baseMs - base delay in milliseconds
   * @param {number} [factor=0.3] - jitter range (0.3 = ±30%)
   * @returns {number} jittered delay (always ≥ 1ms)
   */
  function jitterMs(baseMs, factor = 0.3) {
    const f = Math.min(Math.max(factor, 0), 1);
    return Math.max(1, Math.round(baseMs * (1 + (Math.random() - 0.5) * 2 * f)));
  }

  /**
   * Apply asymmetric jitter — delay is ONLY lengthened, never shortened.
   * Suitable for cooldowns, thresholds, and minimum-wait guards where
   * going below the base value risks a false positive (e.g. mistaking
   * a slow server response for a comparison failure).
   *
   * @param {number} baseMs - floor delay in milliseconds
   * @param {number} [factor=0.3] - maximum increase relative to baseMs
   * @returns {number} jittered delay in [baseMs, baseMs × (1 + factor)]
   */
  function jitterMsFloor(baseMs, factor = 0.3) {
    const f = Math.min(Math.max(factor, 0), 1);
    return Math.round(baseMs * (1 + Math.random() * f));
  }

  /**
   * @file Logger utility with colored console output
   * Provides leveled logging with script prefix and optional styles.
   */


  const STYLES$1 = {
    debug: 'color: #888; font-style: italic;',
    info: 'color: #2196F3; font-weight: bold;',
    warn: 'color: #FF9800; font-weight: bold;',
    error: 'color: #F44336; font-weight: bold;',
  };

  const LABELS = {
    debug: 'DBG',
    info: 'INF',
    warn: 'WRN',
    error: 'ERR',
  };

  function shouldLog(level) {
    return level >= CURRENT_LOG_LEVEL;
  }

  function formatPrefix(level) {
    return `%c[${SCRIPT_NAME}][${LABELS[level]}]`;
  }

  /**
   * Log a debug-level message (verbose, hidden by default).
   * @param  {...any} args - Values to log
   */
  function debug(...args) {
    if (!shouldLog(LOG_LEVEL.DEBUG)) return;
    console.log(formatPrefix(LOG_LEVEL.DEBUG), STYLES$1.debug, ...args);
  }

  /**
   * Log an info-level message.
   * @param  {...any} args - Values to log
   */
  function info(...args) {
    if (!shouldLog(LOG_LEVEL.INFO)) return;
    console.log(formatPrefix(LOG_LEVEL.INFO), STYLES$1.info, ...args);
  }

  /**
   * Log a warning-level message.
   * @param  {...any} args - Values to log
   */
  function warn(...args) {
    if (!shouldLog(LOG_LEVEL.WARN)) return;
    console.warn(formatPrefix(LOG_LEVEL.WARN), STYLES$1.warn, ...args);
  }

  /**
   * Log an error-level message.
   * @param  {...any} args - Values to log
   */
  function error(...args) {
    if (!shouldLog(LOG_LEVEL.ERROR)) return;
    console.error(formatPrefix(LOG_LEVEL.ERROR), STYLES$1.error, ...args);
  }

  /**
   * @file Storage adapter — unified multi-backend persistent storage.
   *
   * Backends (tried in order):
   *   1. localStorage (per-origin, persistent, ~5 MB)
   *   2. In-memory Map (session-only fallback)
   *
   * All public methods return Promises so callers never need to distinguish
   * between sync and async backends.
   *
   * Note: GM sandbox storage (GM_setValue / GM.getValue) is intentionally NOT
   * used because it would require @grant annotations that sandbox the script
   * away from page globals — every DOM / navigator access would then need
   * unsafeWindow.*, which is a disproportionate refactor for the modest quota
   * gain.  localStorage is reliable and sufficient for a compressed face-image
   * pool.
   *
   * @module utils/storage-adapter
   */


  // ---------------------------------------------------------------------------
  // Adapter type
  // ---------------------------------------------------------------------------

  /**
   * @typedef {Object} StorageAdapter
   * @property {(key: string) => Promise<string|null>} get
   * @property {(key: string, value: string) => Promise<void>} set
   * @property {(key: string) => Promise<void>} remove
   * @property {() => Promise<string[]>} keys
   */

  // ---------------------------------------------------------------------------
  // Cached singleton
  // ---------------------------------------------------------------------------

  /** @type {StorageAdapter|null} */
  let _adapter = null;

  // ---------------------------------------------------------------------------
  // Backend detectors
  // ---------------------------------------------------------------------------

  /**
   * Try localStorage (per-origin, persistent).
   * @returns {StorageAdapter|null}
   */
  function detectLocalStorage() {
    try {
      const testKey = '__bfw_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return {
        get: (key) => Promise.resolve(localStorage.getItem(key)),
        set: (key, value) => { localStorage.setItem(key, value); return Promise.resolve(); },
        remove: (key) => { localStorage.removeItem(key); return Promise.resolve(); },
        keys: () => {
          const out = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) out.push(k);
          }
          return Promise.resolve(out);
        },
      };
    } catch (_) { /* unavailable (private browsing, quota, etc.) */ }
    return null;
  }

  /**
   * Build an in-memory fallback adapter (session-only, always available).
   * @returns {StorageAdapter}
   */
  function createMemoryAdapter() {
    const store = new Map();
    return {
      get: (key) => Promise.resolve(store.get(key) ?? null),
      set: (key, value) => { store.set(key, value); return Promise.resolve(); },
      remove: (key) => { store.delete(key); return Promise.resolve(); },
      keys: () => Promise.resolve(Array.from(store.keys())),
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Return the best available storage adapter (cached after first call).
   *
   * Detection order: localStorage → in-memory.
   *
   * @returns {StorageAdapter}
   */
  function getStorageAdapter() {
    if (_adapter) return _adapter;

    // 1. localStorage
    _adapter = detectLocalStorage();
    if (_adapter) { debug('Storage: using localStorage adapter'); return _adapter; }

    // 2. In-memory fallback
    warn('Storage: no persistent backend available, using in-memory (session-only)');
    _adapter = createMemoryAdapter();
    return _adapter;
  }

  /**
   * @file Settings state — centralized toggleable configuration for the userscript.
   *
   * Settings are persisted across page reloads via utils/storage-adapter.js.
   * On load, persisted values are merged over defaults; on every change the
   * full state is flushed to storage.
   *
   * Reserved for future expansion: auto-course (自动刷课) settings group.
   */


  // ---------------------------------------------------------------------------
  // Defaults — the source of truth for all setting keys and their initial values
  // ---------------------------------------------------------------------------

  const DEFAULTS = {
    /** Enable auto-click for face verification UI elements */
    faceAutoClick: true,
    /** Replace the camera video stream with a pool image (getUserMedia interception) */
    videoReplace: true,
    /** Auto-compare after photo — when OFF, pauses after photo for manual confirmation */
    autoCompare: true,

    // ---- Auto-course (自动刷课) ----
    /** Enable auto-course processor — auto-plays course videos and monitors progress */
    autoCourse: false,
    /** Prevent the site from detecting tab-switch / window minimization */
    disableVisibilityCheck: false,

    // ---- Image pool ----
    /** Enable weighted random selection based on per-image quality stats */
    dynamicWeight: true,
  };

  // ---------------------------------------------------------------------------
  // State & listeners
  // ---------------------------------------------------------------------------

  /** @type {{ [key: string]: Array<(val: any) => void> }} */
  const listeners = {};

  /** Runtime state (defaults merged with persisted values after init). */
  const state = { ...DEFAULTS };

  /** Whether the persisted state has been loaded. */
  let loaded$1 = false;

  /**
   * Load persisted settings from storage and merge over defaults.
   * Called once during initialization; safe to call multiple times (idempotent).
   */
  async function loadSettings() {
    if (loaded$1) return;

    try {
      const raw = await getStorageAdapter().get(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Only merge keys that exist in DEFAULTS — ignore unknown/stale keys
          for (const key of Object.keys(DEFAULTS)) {
            if (key in parsed && typeof parsed[key] === typeof DEFAULTS[key]) {
              state[key] = parsed[key];
            }
          }
          debug('Settings: loaded from storage');
        }
      }
    } catch (e) {
      warn('Settings: failed to load from storage, using defaults:', e);
    }

    loaded$1 = true;
    info(`Settings ready: faceAutoClick=${state.faceAutoClick}, videoReplace=${state.videoReplace}, autoCompare=${state.autoCompare}, autoCourse=${state.autoCourse}, disableVisibilityCheck=${state.disableVisibilityCheck}, dynamicWeight=${state.dynamicWeight}`);
  }

  /**
   * Persist the current state to storage (best-effort).
   */
  async function saveSettings() {
    try {
      await getStorageAdapter().set(SETTINGS_KEY, JSON.stringify(state));
    } catch (e) {
      warn('Settings: failed to persist:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get the value of a setting.
   *
   * When settings have been loaded (the normal case after DOMContentLoaded)
   * the in-memory state is returned.  Before that — during the document-start
   * window when interceptors are already installed but loadSettings() hasn't
   * run yet — a synchronous localStorage read is attempted so that persisted
   * preferences are honoured from the very first intercepted call.
   *
   * @template T
   * @param {string} key
   * @param {T} [fallback]
   * @returns {T}
   */
  function getSetting(key, fallback) {
    // Fast path: settings already loaded
    if (loaded$1) {
      return key in state ? state[key] : fallback;
    }

    // Pre-init path: try a synchronous localStorage peek so interceptors
    // that fire before DOMContentLoaded (e.g. video-interceptor) see the
    // user's actual preference instead of the hard-coded default.
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object'
            && key in parsed
            && typeof parsed[key] === typeof DEFAULTS[key]) {
          return parsed[key];
        }
      }
    } catch (_) { /* localStorage unavailable or corrupt — use fallback */ }

    return fallback;
  }

  /**
   * Set a setting value, persist it, and notify listeners.
   * @param {string} key
   * @param {*} value
   */
  function setSetting(key, value) {
    const old = state[key];
    if (old === value) return;
    state[key] = value;

    // Fire-and-forget persistence — never block the UI
    saveSettings();

    if (listeners[key]) {
      listeners[key].forEach((fn) => { try { fn(value); } catch (_) { /* noop */ } });
    }
  }

  /**
   * Register a listener for changes to a setting.
   * @param {string} key
   * @param {(val: any) => void} fn
   * @returns {() => void} Unsubscribe function
   */
  function onChange(key, fn) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
    return () => {
      listeners[key] = listeners[key].filter((f) => f !== fn);
    };
  }

  /**
   * Check whether face auto-click is enabled.
   * Convenience aggregator — used by the auto-processor to decide whether to run.
   * @returns {boolean}
   */
  function isFaceAutoActive() {
    return state.faceAutoClick;
  }

  /**
   * @file Progress tracker — persistent learning session history and statistics.
   *
   * Responsibilities:
   *   1. Track learning sessions (start/end time, chapters/lessons completed, duration).
   *   2. Store per-course statistics (total lessons, completion date, last studied).
   *   3. Calculate aggregate stats (total study time, completion rate, daily activity).
   *   4. Provide queryable history for UI display (today, this week, all time).
   *
   * Storage schema:
   *   {
   *     sessions: [{ id, courseId, startTime, endTime, chaptersCompleted, lessonsCompleted, duration }],
   *     courses: { [courseId]: { name, totalLessons, completedCount, firstStudy, lastStudy, sessions } }
   *   }
   */


  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  /** Current schema version for progress data */
  const SCHEMA_VERSION = 1;

  // ---------------------------------------------------------------------------
  // Utility Functions
  // ---------------------------------------------------------------------------

  /**
   * Format a timestamp as YYYY-MM-DD.
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string}
   */
  function formatDate(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Format a timestamp as YYYY-MM-DD HH:MM.
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string}
   */
  function formatDateTime(timestamp) {
    const d = new Date(timestamp);
    return `${formatDate(timestamp)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** In-memory cache of progress data */
  let progressData = {
    version: SCHEMA_VERSION,
    sessions: [],
    courses: {},
    lastSync: 0,
  };

  /** Whether data has been loaded from storage */
  let loaded = false;

  /** Current session tracking */
  let currentSession = null;

  /** Debounce timer for saveProgressData */
  let saveTimer = null;

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Migrate old data format to the current schema version.
   * @param {Object} data - Raw data from storage
   * @returns {Object} Migrated data
   */
  function migrateData(data) {
    const version = data.version || 0;

    // Version 0 → 1: Add version field
    if (version === 0) {
      debug('ProgressTracker: migrating data from v0 to v1');
      data.version = 1;
      // V0 to V1: no schema changes, just add version field
    }

    // Future migrations go here:
    // if (version === 1) { ... migrate to v2 ... }

    return data;
  }

  /**
   * Validate and sanitize progress data schema.
   * Ensures all required fields exist and are of the correct type.
   * @param {Object} data - Data object to validate
   * @returns {Object} Validated and sanitized data
   */
  function validateSchema(data) {
    // Ensure top-level structure
    if (!data || typeof data !== 'object') {
      warn('ProgressTracker: invalid data object, resetting to empty');
      return {
        version: SCHEMA_VERSION,
        sessions: [],
        courses: {},
        lastSync: Date.now(),
      };
    }

    // Validate version
    if (typeof data.version !== 'number') {
      data.version = SCHEMA_VERSION;
    }

    // Validate sessions array
    if (!Array.isArray(data.sessions)) {
      warn('ProgressTracker: sessions is not an array, resetting');
      data.sessions = [];
    } else {
      // Filter out invalid session entries
      data.sessions = data.sessions.filter(s => {
        if (!s || typeof s !== 'object') return false;
        if (typeof s.id !== 'string') return false;
        if (typeof s.courseId !== 'string') return false;
        if (typeof s.startTime !== 'number') return false;
        // endTime can be null for unfinished sessions
        if (s.endTime !== null && typeof s.endTime !== 'number') return false;
        return true;
      });

      // Fill in lessonsAtStart for sessions saved before this field existed.
      // Old sessions stored lessonsCompleted as the total (not delta).  We
      // default lessonsAtStart to 0 so the existing lessonsCompleted value
      // is treated as the delta — correct for single-session courses, but
      // may over-count for courses with multiple old sessions.  Users in
      // that situation should clear stats ("清空统计") to get accurate
      // numbers going forward.
      for (const s of data.sessions) {
        if (typeof s.lessonsAtStart !== 'number') {
          s.lessonsAtStart = 0;
        }
      }
    }

    // Validate courses object
    if (typeof data.courses !== 'object' || data.courses === null || Array.isArray(data.courses)) {
      warn('ProgressTracker: courses is not an object, resetting');
      data.courses = {};
    } else {
      // Sanitize course entries
      for (const [courseId, course] of Object.entries(data.courses)) {
        if (!course || typeof course !== 'object') {
          delete data.courses[courseId];
          continue;
        }
        // Ensure required fields exist with defaults
        if (typeof course.name !== 'string') course.name = 'Unknown Course';
        if (typeof course.totalLessons !== 'number') course.totalLessons = 0;
        if (typeof course.completedCount !== 'number') course.completedCount = 0;
        if (typeof course.firstStudy !== 'number') course.firstStudy = Date.now();
        if (!Array.isArray(course.sessions)) course.sessions = [];
      }
    }

    // Validate lastSync
    if (typeof data.lastSync !== 'number') {
      data.lastSync = Date.now();
    }

    return data;
  }

  /**
   * Force a full reload of progress data from storage.
   * Used by import-export after writing directly to storage.
   * @returns {Promise<void>}
   */
  async function reloadProgress() {
    loaded = false;
    await loadProgressTracker();
  }

  /**
   * Load progress history from storage.
   * Called once during boot; idempotent.
   */
  async function loadProgressTracker() {
    if (loaded) return;

    try {
      const raw = await getStorageAdapter().get(PROGRESS_TRACKER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const migrated = migrateData(parsed);
          const validated = validateSchema(migrated);
          progressData = validated;

          // Seal any unfinished sessions that are too old to resume.
          // These are leftovers from a hard crash or a browser kill — they were
          // pre-persisted by startSession() but never reached endSession().
          const resumeAge = PROGRESS_TRACKER_CONFIG.RESUME_MAX_AGE_MS;
          let sealedCount = 0;
          for (const s of progressData.sessions) {
            if (s.endTime === null && (Date.now() - s.startTime) >= resumeAge) {
              s.endTime = s.startTime;  // zero-duration; will be skipped by stats
              s.duration = 0;
              sealedCount++;
            }
          }
          if (sealedCount > 0) {
            debug(`ProgressTracker: sealed ${sealedCount} stale unfinished session(s)`);
          }

          debug(`ProgressTracker: loaded ${progressData.sessions.length} sessions, ${Object.keys(progressData.courses).length} courses (schema v${progressData.version})`);
        }
      }
    } catch (e) {
      warn('ProgressTracker: failed to load from storage:', e);
    }

    loaded = true;
  }

  /**
   * Persist the current progress data to storage (best-effort).
   */
  async function saveProgressData() {
    try {
      progressData.lastSync = Date.now();
      await getStorageAdapter().set(PROGRESS_TRACKER_KEY, JSON.stringify(progressData));
    } catch (e) {
      warn('ProgressTracker: failed to persist:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  /**
   * Start a new learning session.
   * Returns a session ID that should be passed to endSession().
   *
   * @param {string} courseId - Unique course identifier
   * @param {string} courseName - Human-readable course name
   * @returns {string} Session ID
   */
  function startSession(courseId, courseName) {
    // Fast path: in-memory session for the same course is still live
    if (currentSession && currentSession.courseId === courseId) {
      debug(`ProgressTracker: resuming in-memory session ${currentSession.id}`);
      return currentSession.id;
    }

    // If there's a different in-memory session, end it first
    if (currentSession) {
      warn(`ProgressTracker: ending previous session ${currentSession.id} before starting new one`);
      endSession().catch(e => warn('Failed to end previous session:', e));
    }

    // Cross-refresh recovery: look for an unfinished persisted session for this
    // course that was abandoned (e.g. tab reload, SPA navigation).  Only resume
    // if it started recently enough to still be meaningful.
    const resumeAge = PROGRESS_TRACKER_CONFIG.RESUME_MAX_AGE_MS;
    const unfinished = progressData.sessions.findLast(
      s => s.courseId === courseId && s.endTime === null && (Date.now() - s.startTime) < resumeAge,
    );

    if (unfinished) {
      currentSession = { ...unfinished };
      debug(`ProgressTracker: recovered unfinished session ${unfinished.id} after page reload`);
      return unfinished.id;
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    currentSession = {
      id: sessionId,
      courseId,
      courseName,
      startTime: Date.now(),
      endTime: null,
      chaptersCompleted: 0,
      lessonsCompleted: 0,
      /** Number of lessons already completed when this session started.
       *  -1 = baseline not yet captured (React state not available).
       *  Used to compute the delta of lessons completed *during* this session. */
      lessonsAtStart: -1,
      duration: 0,
    };

    // Initialize course record if not exists
    if (!(courseId in progressData.courses)) {
      progressData.courses[courseId] = {
        name: courseName,
        totalLessons: 0,
        completedCount: 0,
        firstStudy: Date.now(),
        lastStudy: null,
        sessions: [],
      };
    }

    // Persist the new session immediately so it can be recovered on page reload
    // before endSession() is ever called.
    progressData.sessions.push(currentSession);
    saveProgressData().catch(e => warn('ProgressTracker: failed to persist new session:', e));

    debug(`ProgressTracker: started session ${sessionId} for course "${courseName}"`);
    return sessionId;
  }

  /**
   * Update the current session with progress data.
   * Should be called periodically (e.g., on every course-processor tick).
   * Changes are debounced and saved after 5 seconds of inactivity.
   *
   * @param {number} chaptersCompleted
   * @param {number} lessonsCompleted
   * @param {number} totalLessons
   */
  function updateSession(chaptersCompleted, lessonsCompleted, totalLessons) {
    if (!currentSession) return;

    currentSession.chaptersCompleted = chaptersCompleted;
    currentSession.lessonsCompleted = lessonsCompleted;

    // Lazily capture the baseline of already-completed lessons on the first
    // React state read (totalLessons > 0 in the caller already guarantees
    // React has rendered).  Capturing even when lessonsCompleted is 0 is
    // essential — if we wait for a non-zero value, the baseline ends up > 0
    // and the delta at session-end is zero for every lesson completed.
    if (currentSession.lessonsAtStart === -1) {
      currentSession.lessonsAtStart = lessonsCompleted;
    }

    // Update course record from React ground-truth
    const course = progressData.courses[currentSession.courseId];
    if (course) {
      if (totalLessons > course.totalLessons) {
        course.totalLessons = totalLessons;
      }
      // Keep completedCount in sync with the current React-reported total.
      // Using Math.max prevents transient zeros from overwriting real data
      // when React briefly unmounts during SPA navigation.
      course.completedCount = Math.max(course.completedCount || 0, lessonsCompleted);
    }

    // Debounced save (avoid excessive writes during active learning)
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveProgressData().catch(e => warn('ProgressTracker: debounced save failed:', e));
    }, 5000);
  }

  /**
   * End the current session and save it to history.
   * Should be called when leaving a course or stopping learning.
   * Clears any pending debounced saves and immediately persists.
   */
  async function endSession() {
    if (!currentSession) return;

    // Clear pending debounced save since we're doing an immediate save
    clearTimeout(saveTimer);
    saveTimer = null;

    currentSession.endTime = Date.now();
    currentSession.duration = Math.round((currentSession.endTime - currentSession.startTime) / 1000);

    // ---- Compute the delta of lessons completed *during* this session ----
    // currentSession.lessonsCompleted holds the TOTAL from the last React state read.
    // lessonsAtStart is the TOTAL when we first saw non-zero React data.
    // The delta is what actually changed — this is what stats should sum.
    const totalCompleted = currentSession.lessonsCompleted;
    const baseline = currentSession.lessonsAtStart >= 0 ? currentSession.lessonsAtStart : totalCompleted;
    const delta = Math.max(0, totalCompleted - baseline);
    // Overwrite with delta so stats aggregation (sum of session.lessonsCompleted)
    // produces the correct total instead of inflating it.
    currentSession.lessonsCompleted = delta;

    // Discard sessions that are too short and produced nothing — these are
    // almost always page reloads or SPA navigations that fired stopCourseMonitor
    // before any real learning happened.
    const { MIN_SESSION_DURATION_S } = PROGRESS_TRACKER_CONFIG;
    if (currentSession.duration < MIN_SESSION_DURATION_S && delta === 0 && totalCompleted === 0) {
      // Remove the pre-persisted placeholder written in startSession
      const idx = progressData.sessions.findIndex(s => s.id === currentSession.id);
      if (idx !== -1) progressData.sessions.splice(idx, 1);

      debug(`ProgressTracker: discarded trivial session ${currentSession.id} (${currentSession.duration}s, 0 lessons)`);
      currentSession = null;
      await saveProgressData();
      return;
    }

    // Update the in-place record that was persisted during startSession
    const existing = progressData.sessions.find(s => s.id === currentSession.id);
    if (existing) {
      Object.assign(existing, currentSession);
    } else {
      // Fallback: session was not pre-persisted (e.g. recovered via findLast path
      // after a reload where the old entry already had an endTime).
      progressData.sessions.push(currentSession);
    }

    // Update course record
    const course = progressData.courses[currentSession.courseId];
    if (course) {
      course.lastStudy = currentSession.endTime;
      // Use Math.max to avoid transient decreases (e.g. from React unmount/remount
      // during SPA navigation). completedCount is also kept in sync by updateSession
      // during active learning, so this is a safety net.
      course.completedCount = Math.max(course.completedCount || 0, totalCompleted);
      course.sessions = (course.sessions || []).includes(currentSession.id)
        ? course.sessions
        : (course.sessions || []).concat(currentSession.id);
    }

    debug(`ProgressTracker: ended session ${currentSession.id}, duration ${currentSession.duration}s, delta ${delta} lessons (${totalCompleted} total)`);

    currentSession = null;
    await saveProgressData();
  }

  /**
   * Synchronously flush the current session end to localStorage.
   *
   * Called from beforeunload handlers where async work may not complete.
   * Writes directly to localStorage (skips the async storage adapter) so the
   * session is saved even if the browser is about to tear down the page.
   *
   * Falls back to the async path if localStorage is unavailable.
   */
  function flushSessionSync() {
    if (!currentSession) return;

    // Clear pending debounced save
    clearTimeout(saveTimer);
    saveTimer = null;

    currentSession.endTime = Date.now();
    currentSession.duration = Math.round((currentSession.endTime - currentSession.startTime) / 1000);

    // ---- Compute delta (same logic as endSession) ----
    const totalCompleted = currentSession.lessonsCompleted;
    const baseline = currentSession.lessonsAtStart >= 0 ? currentSession.lessonsAtStart : totalCompleted;
    const delta = Math.max(0, totalCompleted - baseline);
    currentSession.lessonsCompleted = delta;

    // Skip trivial sessions
    const { MIN_SESSION_DURATION_S } = PROGRESS_TRACKER_CONFIG;
    if (currentSession.duration < MIN_SESSION_DURATION_S && delta === 0 && totalCompleted === 0) {
      const idx = progressData.sessions.findIndex(s => s.id === currentSession.id);
      if (idx !== -1) progressData.sessions.splice(idx, 1);
      currentSession = null;

      // Synchronous persistence
      try {
        progressData.lastSync = Date.now();
        localStorage.setItem(PROGRESS_TRACKER_KEY, JSON.stringify(progressData));
      } catch (e) { /* best-effort */ }
      return;
    }

    // Update the in-place record
    const existing = progressData.sessions.find(s => s.id === currentSession.id);
    if (existing) {
      Object.assign(existing, currentSession);
    } else {
      progressData.sessions.push(currentSession);
    }

    // Update course record
    const course = progressData.courses[currentSession.courseId];
    if (course) {
      course.lastStudy = currentSession.endTime;
      course.completedCount = Math.max(course.completedCount || 0, totalCompleted);
      if (!(course.sessions || []).includes(currentSession.id)) {
        course.sessions = (course.sessions || []).concat(currentSession.id);
      }
    }

    // Synchronous persistence — write directly to localStorage
    progressData.lastSync = Date.now();
    try {
      localStorage.setItem(PROGRESS_TRACKER_KEY, JSON.stringify(progressData));
      debug(`ProgressTracker: flushed session ${currentSession.id} synchronously`);
    } catch (e) {
      // Fallback to async adapter
      saveProgressData().catch(() => {});
    }

    currentSession = null;
  }

  // ---------------------------------------------------------------------------
  // Statistics & Queries
  // ---------------------------------------------------------------------------

  /**
   * Get today's statistics.
   * @returns {{ sessionsCount: number, totalDuration: number, lessonsCompleted: number, coursesStudied: Set<string> }}
   */
  function getTodayStats() {
    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todaySessions = progressData.sessions.filter(s => s.endTime && s.endTime >= todayStart.getTime());

    return {
      sessionsCount: todaySessions.length,
      totalDuration: Math.round(todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
      lessonsCompleted: todaySessions.reduce((sum, s) => sum + s.lessonsCompleted, 0),
      coursesStudied: new Set(todaySessions.map(s => s.courseId)),
    };
  }

  /**
   * Get this week's statistics (last 7 days).
   * @returns {{ sessionsCount: number, totalDuration: number, lessonsCompleted: number, daysActive: number }}
   */
  function getWeekStats() {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weekStart = now - weekMs;

    const weekSessions = progressData.sessions.filter(s => s.endTime && s.endTime >= weekStart);

    const daysActive = new Set(
      weekSessions.map(s => formatDate(s.endTime))
    ).size;

    return {
      sessionsCount: weekSessions.length,
      totalDuration: Math.round(weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
      lessonsCompleted: weekSessions.reduce((sum, s) => sum + s.lessonsCompleted, 0),
      daysActive,
    };
  }

  /**
   * Get daily study data for the last N days (for chart visualization).
   * Returns an array of { date, duration, lessons, label } ordered from oldest to newest.
   *
   * @param {number} [days=7] - Number of days to include
   * @returns {Array<{date: string, duration: number, lessons: number, label: string}>}
   */
  function getDailyTrendData(days = 7) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Build maps of date -> total duration (minutes) and lessons completed
    const dailyMap = new Map();
    const lessonsMap = new Map();

    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      d.setHours(0, 0, 0, 0);
      const key = formatDate(d.getTime());
      dailyMap.set(key, 0);
      lessonsMap.set(key, 0);
    }

    // Aggregate session data by date
    progressData.sessions.forEach(s => {
      if (!s.endTime) return;
      const sessionDate = new Date(s.endTime);
      sessionDate.setHours(0, 0, 0, 0);
      const key = formatDate(sessionDate.getTime());
      if (dailyMap.has(key)) {
        dailyMap.set(key, dailyMap.get(key) + Math.round((s.duration || 0) / 60));
        lessonsMap.set(key, lessonsMap.get(key) + (s.lessonsCompleted || 0));
      }
    });

    // Convert to array with short labels (e.g., "周一", "周二", or "1/15")
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      d.setHours(0, 0, 0, 0);
      const key = formatDate(d.getTime());
      const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
      const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
      result.push({
        date: key,
        duration: dailyMap.get(key) || 0,
        lessons: lessonsMap.get(key) || 0,
        label: days <= 7 ? dayOfWeek : monthDay,
      });
    }

    return result;
  }

  /**
   * Get all-time statistics.
   * @returns {{ sessionsCount: number, totalDuration: number, lessonsCompleted: number, coursesCount: number, totalLessons: number }}
   */
  function getAllTimeStats() {
    const totalDuration = Math.round(
      progressData.sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60
    );

    const totalLessons = Object.values(progressData.courses).reduce(
      (sum, course) => sum + (course.totalLessons || 0),
      0
    );

    return {
      sessionsCount: progressData.sessions.length,
      totalDuration,
      lessonsCompleted: progressData.sessions.reduce((sum, s) => sum + s.lessonsCompleted, 0),
      coursesCount: Object.keys(progressData.courses).length,
      totalLessons,
    };
  }

  /**
   * Get recent sessions for display.
   * @param {number} [limit=10]
   * @returns {Array}
   */
  function getRecentSessions(limit = 10) {
    return progressData.sessions
      .slice(-limit)
      .reverse()
      .map(s => ({
        ...s,
        durationMin: Math.round(s.duration / 60),
        startDate: formatDateTime(s.startTime),
      }));
  }

  /**
   * Get all courses sorted by last study time (most recent first).
   * @returns {Array}
   */
  function getCoursesList() {
    return Object.entries(progressData.courses)
      .map(([id, data]) => {
        // Calculate total study time from all sessions for this course
        const courseSessions = progressData.sessions.filter(s => s.courseId === id);
        const totalStudyTime = Math.round(
          courseSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60
        );

        return {
          id,
          ...data,
          completionRate: data.totalLessons > 0 ? Math.round((data.completedCount / data.totalLessons) * 100) : 0,
          totalStudyTime,
        };
      })
      .sort((a, b) => (b.lastStudy || 0) - (a.lastStudy || 0));
  }

  /**
   * Clear all progress history (destructive).
   * Use with caution.
   */
  async function clearAllProgress() {
    progressData = {
      version: SCHEMA_VERSION,
      sessions: [],
      courses: {},
      lastSync: Date.now(),
    };
    currentSession = null;
    await saveProgressData();
    debug('ProgressTracker: cleared all progress history');
  }

  /**
   * Get cached progress data reference (read-only).
   * @returns {Object}
   */
  function getProgressData() {
    return progressData;
  }

  /**
   * @file Face-detection-aware smart cropping.
   *
   * Two-tier pipeline for positioning the crop window:
   *
   *   Tier 1: Skin-color heuristic (YCbCr on downscaled canvas)
   *           → density-cluster centroid of skin-tone pixels
   *
   *   Tier 2: Fixed vertical bias (CROP_FALLBACK_BIAS = 0.38)
   *           → identical to the previous hard-coded behaviour
   *
   * Each tier falls through silently on failure so the pipeline degrades
   * gracefully on any browser.
   */


  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Smart-crop an image to the standard output dimensions (400×300).
   *
   * Attempts face detection to position the crop window around the most
   * visually important region.  Falls back to a fixed vertical bias when
   * no faces or skin regions can be found.
   *
   * @param {HTMLImageElement} img - decoded image (onload already fired)
   * @returns {Promise<{ dataUrl: string, width: number, height: number }>}
   */
  async function smartCropToStandard(img) {
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    // Run the face-detection pipeline
    const { faces } = await detectFaces(img);

    let attentionX, attentionY, cropBias;

    if (faces && faces.length > 0) {
      // Area-weighted centroid of all detected faces.
      // Prefer the density-weighted centroid (cx/cy) when the heuristic
      // provides it — it is more precise than the geometric box centre.
      let totalWeight = 0;
      attentionX = 0;
      attentionY = 0;
      for (const f of faces) {
        const fx = f.cx != null ? f.cx : (f.x + f.width / 2);
        const fy = f.cy != null ? f.cy : (f.y + f.height / 2);
        const area = f.width * f.height;
        attentionX += fx * area;
        attentionY += fy * area;
        totalWeight += area;
      }
      attentionX /= totalWeight;
      attentionY /= totalWeight;
      // Faces detected → use the face-aware crop bias (tighter framing)
      cropBias = FACE_DETECT_CONFIG.CROP_FACE_BIAS;
      debug(`Smart crop: ${faces.length} face(s) detected, attention at (${attentionX.toFixed(0)}, ${attentionY.toFixed(0)})`);
    } else {
      // Tier 2 fallback: no faces — use heuristic upper bias
      attentionX = srcW / 2;
      attentionY = srcH * FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
      cropBias = FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
      debug('Smart crop: no faces detected, using fixed bias fallback');
    }

    const cropRect = computeCropRect(srcW, srcH, attentionX, attentionY, cropBias);
    const result = renderCrop(img, cropRect);
    return { ...result, cropRect };
  }

  /**
   * Run the full face-detection pipeline and return debug information
   * for visualization in the face preview modal.
   *
   * @param {HTMLImageElement} img - decoded image (onload already fired)
   * @returns {Promise<{faces: Array<{x:number,y:number,width:number,height:number}>|null, tier: 'skin'|'fallback', attentionPoint: {x:number,y:number}|null, cropRect: {sx:number,sy:number,sw:number,sh:number}|null}>}
   */
  async function detectFacesDebug(img) {
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const { faces, tier } = await detectFaces(img);

    let attentionX, attentionY, cropBias;

    if (faces && faces.length > 0) {
      let totalWeight = 0;
      attentionX = 0;
      attentionY = 0;
      for (const f of faces) {
        const fx = f.cx != null ? f.cx : (f.x + f.width / 2);
        const fy = f.cy != null ? f.cy : (f.y + f.height / 2);
        const area = f.width * f.height;
        attentionX += fx * area;
        attentionY += fy * area;
        totalWeight += area;
      }
      attentionX /= totalWeight;
      attentionY /= totalWeight;
      cropBias = FACE_DETECT_CONFIG.CROP_FACE_BIAS;
    } else {
      attentionX = srcW / 2;
      attentionY = srcH * FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
      cropBias = FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
    }

    const cropRect = computeCropRect(srcW, srcH, attentionX, attentionY, cropBias);

    return {
      faces,
      tier,
      attentionPoint: { x: attentionX, y: attentionY },
      cropRect,
    };
  }

  // ---------------------------------------------------------------------------
  // Detection orchestrator
  // ---------------------------------------------------------------------------

  /**
   * Run the two-tier detection pipeline.
   *
   * @param {HTMLImageElement} img
   * @returns {Promise<{faces: Array<{x:number,y:number,width:number,height:number}>|null, tier: 'skin'|'fallback'}>}
   */
  async function detectFaces(img) {
    // Tier 1: Skin-color heuristic
    const skinFaces = detectFacesSkinHeuristic(img);
    if (skinFaces && skinFaces.length > 0) return { faces: skinFaces, tier: 'skin' };

    // Tier 2: nothing found — caller uses fixed bias
    return { faces: null, tier: 'fallback' };
  }

  // ---------------------------------------------------------------------------
  // Tier 1: Skin-color heuristic (YCbCr on downscaled canvas)
  // ---------------------------------------------------------------------------

  /**
   * Estimate face position by detecting connected skin-tone regions.
   *
   * P0 pipeline:
   *   1. Classify skin pixels on a downscaled canvas
   *   2. Build connected components on the binary skin mask
   *   3. Score each component by size, vertical prior, edge density,
   *      aspect ratio, dominance, and top/bottom taper
   *   4. Fall back when the best component is too weak or ambiguous
   *   5. Reuse the existing density-cliff and aspect-ratio safeguards to
   *      trim neck bleed from the selected component
   *
   * @param {HTMLImageElement} img
   * @returns {Array<{x:number,y:number,width:number,height:number,cx?:number,cy?:number}>|null}
   */
  function detectFacesSkinHeuristic(img) {
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const cfg = FACE_DETECT_CONFIG;

    const scale = Math.min(cfg.SKIN_SAMPLE_SIZE / srcW, cfg.SKIN_SAMPLE_SIZE / srcH);
    const cw = Math.max(1, Math.round(srcW * scale));
    const ch = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, cw, ch);

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, cw, ch);
    } catch (_) {
      debug('Skin heuristic: canvas tainted, cannot read pixels');
      return null;
    }

    const { data } = imageData;
    const pixelCount = cw * ch;
    const skinMask = new Uint8Array(pixelCount);
    const edgeMask = new Uint8Array(pixelCount);
    let totalSkin = 0;

    for (let py = 0; py < ch; py++) {
      for (let px = 0; px < cw; px++) {
        const pixelIndex = py * cw + px;
        const i = pixelIndex * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const cb = 128 - 0.169 * r - 0.331 * g + 0.500 * b;
        const cr = 128 + 0.500 * r - 0.419 * g - 0.081 * b;

        if (cb >= cfg.SKIN_CB_MIN && cb <= cfg.SKIN_CB_MAX
            && cr >= cfg.SKIN_CR_MIN && cr <= cfg.SKIN_CR_MAX) {
          skinMask[pixelIndex] = 1;
          totalSkin++;

          if (px < cw - 1) {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const i2 = i + 4;
            const lum2 = 0.299 * data[i2] + 0.587 * data[i2 + 1] + 0.114 * data[i2 + 2];
            if (Math.abs(lum - lum2) > cfg.SKIN_EDGE_LUM_THRESHOLD) {
              edgeMask[pixelIndex] = 1;
            }
          }
        }
      }
    }

    if (totalSkin < cfg.SKIN_MIN_PIXELS) {
      debug(`Skin heuristic: only ${totalSkin} skin pixels (need ${cfg.SKIN_MIN_PIXELS})`);
      return null;
    }

    const minComponentPixels = Math.max(
      cfg.SKIN_COMPONENT_MIN_PIXELS,
      Math.round(pixelCount * cfg.SKIN_COMPONENT_MIN_AREA_RATIO),
    );
    const components = collectSkinComponents(skinMask, edgeMask, cw, ch, cfg, minComponentPixels);
    if (components.length === 0) {
      debug(`Skin heuristic: ${totalSkin} skin px but no component survived min area ${minComponentPixels}`);
      return null;
    }

    const candidates = components
      .map((component) => scoreSkinComponent(component, totalSkin, cw, ch, cfg))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      debug(`Skin heuristic: ${components.length} component(s) found, none passed candidate scoring`);
      return null;
    }

    const best = candidates[0];
    const second = candidates[1] || null;
    const margin = second ? best.score - second.score : best.score;

    debug(
      `Skin heuristic: ${totalSkin} skin px, ${components.length} component(s), `
      + `best score=${best.score.toFixed(2)} `
      + `(area=${best.component.area}, edge=${best.edgeRatio.toFixed(3)}, aspect=${best.aspect.toFixed(2)}, cy=${best.centerY.toFixed(1)})`
      + (second ? `, second=${second.score.toFixed(2)}, margin=${margin.toFixed(2)}` : ''),
    );

    if (best.score < cfg.SKIN_COMPONENT_SCORE_THRESHOLD
        || (second && margin < cfg.SKIN_COMPONENT_MIN_SCORE_MARGIN)) {
      debug(
        `Skin heuristic: low-confidence candidate `
        + `(best=${best.score.toFixed(2)}, threshold=${cfg.SKIN_COMPONENT_SCORE_THRESHOLD.toFixed(2)}, margin=${margin.toFixed(2)})`,
      );
      return null;
    }

    const result = finalizeComponentFace(best.component, srcW, srcH, cw, ch, edgeMask, cfg);
    if (!result) {
      debug('Skin heuristic: selected component failed finalization');
      return null;
    }

    return [result];
  }

  function collectSkinComponents(skinMask, edgeMask, cw, ch, cfg, minComponentPixels) {
    const visited = new Uint8Array(cw * ch);
    const components = [];

    for (let start = 0; start < skinMask.length; start++) {
      if (!skinMask[start] || visited[start]) continue;

      const stack = [start];
      visited[start] = 1;

      const component = {
        area: 0,
        edgeCount: 0,
        minX: cw,
        maxX: -1,
        minY: ch,
        maxY: -1,
        weightedX: 0,
        weightedY: 0,
        weightSum: 0,
        pixels: [],
      };

      while (stack.length > 0) {
        const idx = stack.pop();
        const x = idx % cw;
        const y = Math.floor(idx / cw);

        component.area++;
        component.pixels.push(idx);
        if (edgeMask[idx]) component.edgeCount++;
        if (x < component.minX) component.minX = x;
        if (x > component.maxX) component.maxX = x;
        if (y < component.minY) component.minY = y;
        if (y > component.maxY) component.maxY = y;

        const weight = getSkinPixelWeight(y, ch, edgeMask[idx], cfg);
        component.weightedX += (x + 0.5) * weight;
        component.weightedY += (y + 0.5) * weight;
        component.weightSum += weight;

        for (let ny = Math.max(0, y - 1); ny <= Math.min(ch - 1, y + 1); ny++) {
          for (let nx = Math.max(0, x - 1); nx <= Math.min(cw - 1, x + 1); nx++) {
            if (nx === x && ny === y) continue;
            const nidx = ny * cw + nx;
            if (!skinMask[nidx] || visited[nidx]) continue;
            visited[nidx] = 1;
            stack.push(nidx);
          }
        }
      }

      if (component.area >= minComponentPixels) {
        components.push(component);
      }
    }

    return components;
  }

  function scoreSkinComponent(component, totalSkin, cw, ch, cfg) {
    const width = component.maxX - component.minX + 1;
    const height = component.maxY - component.minY + 1;
    if (width <= 0 || height <= 0) return null;

    const aspect = height / width;
    if (aspect < cfg.SKIN_COMPONENT_MIN_ASPECT_RATIO
        || aspect > cfg.SKIN_COMPONENT_MAX_CANDIDATE_ASPECT_RATIO) {
      return null;
    }

    const areaRatio = component.area / (cw * ch);
    const edgeRatio = component.edgeCount / Math.max(component.area, 1);
    if (component.area >= Math.round(cw * ch * 0.03)
        && edgeRatio < cfg.SKIN_COMPONENT_HARD_MIN_EDGE_RATIO) {
      return null;
    }

    const centerY = component.weightSum > 0
      ? component.weightedY / component.weightSum
      : (component.minY + component.maxY + 1) / 2;
    if (centerY > ch * 0.84) return null;

    const areaScore = clamp01(
      (areaRatio - cfg.SKIN_COMPONENT_MIN_AREA_RATIO)
      / Math.max(cfg.SKIN_COMPONENT_TARGET_AREA_RATIO - cfg.SKIN_COMPONENT_MIN_AREA_RATIO, 0.0001),
    );
    const verticalScore = clamp01(1 - centerY / Math.max(ch * 0.85, 1));
    const edgeScore = clamp01(
      (edgeRatio - cfg.SKIN_COMPONENT_MIN_EDGE_RATIO)
      / Math.max(0.06 - cfg.SKIN_COMPONENT_MIN_EDGE_RATIO, 0.0001),
    );
    const aspectScore = scoreAspect(aspect, cfg.SKIN_COMPONENT_IDEAL_ASPECT_RATIO);
    const shareScore = clamp01((component.area / Math.max(totalSkin, 1)) / 0.55);
    const taperScore = measureComponentTaper(component, cw);

    const score = areaScore * cfg.SKIN_SCORE_WEIGHT_AREA
      + verticalScore * cfg.SKIN_SCORE_WEIGHT_VERTICAL
      + edgeScore * cfg.SKIN_SCORE_WEIGHT_EDGE
      + aspectScore * cfg.SKIN_SCORE_WEIGHT_ASPECT
      + shareScore * cfg.SKIN_SCORE_WEIGHT_SHARE
      + taperScore * cfg.SKIN_SCORE_WEIGHT_TAPER;

    return {
      component,
      score,
      aspect,
      edgeRatio,
      centerY,
    };
  }

  function finalizeComponentFace(component, srcW, srcH, cw, ch, edgeMask, cfg) {
    const rowData = buildComponentRowData(component, cw);
    let minY = component.minY;
    let maxY = component.maxY;

    {
      const clippedMaxY = findDensityCliffCutoff(rowData, minY, maxY, cfg);
      if (clippedMaxY < maxY) {
        debug(`Skin heuristic: density cliff at row ${clippedMaxY}, face bottom clipped`);
        maxY = clippedMaxY;
      }
    }

    let bounds = boundsForRows(rowData, minY, maxY);
    if (!bounds) return null;

    let regionW = bounds.maxX - bounds.minX + 1;
    let regionH = bounds.maxY - bounds.minY + 1;
    if (regionH / regionW > cfg.SKIN_MAX_ASPECT_RATIO) {
      const maxRows = Math.max(1, Math.ceil(regionW * cfg.SKIN_MAX_ASPECT_RATIO));
      const trimmed = regionH - maxRows;
      if (trimmed > 0) {
        maxY = bounds.minY + maxRows - 1;
        debug(`Skin heuristic: region too tall (${(regionH / regionW).toFixed(1)}:1), trimmed ${trimmed} row(s) from bottom`);
        bounds = boundsForRows(rowData, bounds.minY, maxY);
        if (!bounds) return null;
        regionW = bounds.maxX - bounds.minX + 1;
        regionH = bounds.maxY - bounds.minY + 1;
      }
    }

    let weightedX = 0;
    let weightedY = 0;
    let weightSum = 0;
    for (const idx of component.pixels) {
      const x = idx % cw;
      const y = Math.floor(idx / cw);
      if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) continue;
      const weight = getSkinPixelWeight(y, ch, edgeMask[idx], cfg);
      weightedX += (x + 0.5) * weight;
      weightedY += (y + 0.5) * weight;
      weightSum += weight;
    }

    const scaleX = srcW / cw;
    const scaleY = srcH / ch;
    const faceX = bounds.minX * scaleX;
    const faceY = bounds.minY * scaleY;
    const faceW = regionW * scaleX;
    const faceH = regionH * scaleY;

    const result = {
      x: faceX,
      y: faceY,
      width: faceW,
      height: faceH,
    };

    if (weightSum > 0) {
      result.cx = (weightedX / weightSum) * scaleX;
      const skinCy = (weightedY / weightSum) * scaleY;
      result.cy = skinCy - faceH * cfg.SKIN_HEADROOM_SHIFT;
    }

    return result;
  }

  function buildComponentRowData(component, cw) {
    const height = component.maxY - component.minY + 1;
    const rowCounts = new Array(height).fill(0);
    const rowMinX = new Array(height).fill(Infinity);
    const rowMaxX = new Array(height).fill(-Infinity);

    for (const idx of component.pixels) {
      const x = idx % cw;
      const y = Math.floor(idx / cw);
      const row = y - component.minY;
      rowCounts[row]++;
      if (x < rowMinX[row]) rowMinX[row] = x;
      if (x > rowMaxX[row]) rowMaxX[row] = x;
    }

    return { rowCounts, rowMinX, rowMaxX, baseY: component.minY };
  }

  function boundsForRows(rowData, minY, maxY) {
    let minX = Infinity;
    let maxX = -Infinity;
    let found = false;

    for (let y = minY; y <= maxY; y++) {
      const row = y - rowData.baseY;
      if (row < 0 || row >= rowData.rowCounts.length || rowData.rowCounts[row] === 0) continue;
      if (rowData.rowMinX[row] < minX) minX = rowData.rowMinX[row];
      if (rowData.rowMaxX[row] > maxX) maxX = rowData.rowMaxX[row];
      found = true;
    }

    if (!found) return null;
    return { minX, maxX, minY, maxY };
  }

  function findDensityCliffCutoff(rowData, minY, maxY, cfg) {
    const density = [];
    for (let y = minY; y <= maxY; y++) {
      const row = y - rowData.baseY;
      density.push({ row: y, value: rowData.rowCounts[row] || 0 });
    }

    const startIdx = Math.floor(density.length / 2);
    let bestDrop = 0;
    let dropRow = maxY;
    for (let i = startIdx; i < density.length - 1; i++) {
      if (density[i].value <= 0) continue;
      const drop = (density[i].value - density[i + 1].value) / density[i].value;
      if (drop > bestDrop && drop >= cfg.SKIN_CLIFF_THRESHOLD) {
        bestDrop = drop;
        dropRow = density[i].row;
      }
    }

    return dropRow;
  }

  function measureComponentTaper(component, cw) {
    const rowData = buildComponentRowData(component, cw);
    const height = rowData.rowCounts.length;
    if (height <= 2) return 0.5;

    const band = Math.max(1, Math.floor(height * 0.35));
    let topWidth = 0;
    let topRows = 0;
    let bottomWidth = 0;
    let bottomRows = 0;

    for (let i = 0; i < band; i++) {
      if (rowData.rowCounts[i] > 0) {
        topWidth += rowData.rowMaxX[i] - rowData.rowMinX[i] + 1;
        topRows++;
      }
    }
    for (let i = height - band; i < height; i++) {
      if (i >= 0 && rowData.rowCounts[i] > 0) {
        bottomWidth += rowData.rowMaxX[i] - rowData.rowMinX[i] + 1;
        bottomRows++;
      }
    }

    if (topRows === 0 || bottomRows === 0) return 0.5;
    const ratio = (bottomWidth / bottomRows) / Math.max(topWidth / topRows, 1);
    return clamp01(1 - Math.abs(ratio - 0.85) / 0.55);
  }

  function getSkinPixelWeight(y, ch, hasEdge, cfg) {
    let weight = 1.0;
    if (cfg.SKIN_VERTICAL_WEIGHT_ENABLED) {
      const vertFactor = 1.0 - cfg.SKIN_VERTICAL_WEIGHT_DECAY
        * (y / Math.max(ch - 1, 1));
      weight *= Math.max(0.1, vertFactor);
    }
    if (cfg.SKIN_EDGE_BONUS_ENABLED && hasEdge) {
      weight += cfg.SKIN_EDGE_BONUS_WEIGHT;
    }
    return weight;
  }

  function scoreAspect(aspect, idealAspect) {
    const diff = Math.abs(Math.log(aspect / idealAspect));
    return clamp01(1 - diff / Math.log(1.9));
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  // ---------------------------------------------------------------------------
  // Crop geometry
  // ---------------------------------------------------------------------------

  /**
   * Compute the source crop rectangle that places the attention point at
   * the given vertical bias from the top of the output, while clamping to
   * image bounds so the crop window never extends outside the source.
   *
   * @param {number} srcW - Source image width
   * @param {number} srcH - Source image height
   * @param {number} attentionX - Horizontal attention point (px)
   * @param {number} attentionY - Vertical attention point (px)
   * @param {number} bias - Where the attention point should land vertically
   *   in the output: 0 = top edge, 0.5 = center, 1 = bottom edge.
   * @returns {{ sx: number, sy: number, sw: number, sh: number }}
   */
  function computeCropRect(srcW, srcH, attentionX, attentionY, bias) {
    const targetW = IMAGE_POOL_CONFIG.OUTPUT_WIDTH;
    const targetH = IMAGE_POOL_CONFIG.OUTPUT_HEIGHT;
    const targetRatio = targetW / targetH;
    const srcRatio = srcW / srcH;

    let sx, sy, sw, sh;

    if (Math.abs(srcRatio - targetRatio) < 0.01) {
      // Already the correct ratio — no crop needed
      sx = 0; sy = 0; sw = srcW; sh = srcH;
    } else if (srcRatio > targetRatio) {
      // Too wide — crop sides, center horizontally around the attention point
      sh = srcH;
      sw = sh * targetRatio;
      sx = attentionX - sw / 2;
      sy = 0;
    } else {
      // Too tall — crop top/bottom, position attention point at bias from top
      sw = srcW;
      sh = sw / targetRatio;
      sx = 0;
      sy = attentionY - sh * bias;
    }

    // Clamp to image bounds
    sx = Math.max(0, Math.min(sx, srcW - sw));
    sy = Math.max(0, Math.min(sy, srcH - sh));

    return { sx, sy, sw, sh };
  }

  /**
   * Render the crop rectangle to a canvas and export as JPEG.
   *
   * @param {HTMLImageElement} img
   * @param {{ sx: number, sy: number, sw: number, sh: number }} cropRect
   * @returns {{ dataUrl: string, width: number, height: number }}
   */
  function renderCrop(img, cropRect) {
    const { sx, sy, sw, sh } = cropRect;
    const targetW = IMAGE_POOL_CONFIG.OUTPUT_WIDTH;
    const targetH = IMAGE_POOL_CONFIG.OUTPUT_HEIGHT;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_POOL_CONFIG.JPEG_QUALITY);
    return { dataUrl, width: targetW, height: targetH };
  }

  /**
   * @file Image pool — persistent, uploadable, deduplicated face-image pool.
   *
   * Storage is provided by utils/storage-adapter.js (GM → localStorage → memory).
   *
   * Upload pipeline:
   *   File → FileReader → validate MIME / size → <img> decode
   *        → smart-crop to 400×300 (face-biased) → JPEG compress
   *        → dHash perceptual fingerprint → dedup check → store
   *
   * Each image stores TWO keys:
   *   bfw_img_{id}      — cropped 400×300 JPEG (what the system uses)
   *   bfw_img_orig_{id} — original un-cropped data URI (for manual crop editing)
   *
   * Pick pipeline:
   *   pickImage() → load metadata → pool empty? → fallback canvas face
   *              → random index → load & validate stored image
   *              → load fails? → evict entry, retry (up to 3×)
   *              → apply random mutations (brightness/contrast/saturation/hue
   *                 flip/rotate/scale-jitter + JPEG quality jitter)
   *              → return mutated image (bytes differ every call)
   */


  // ---------------------------------------------------------------------------
  // Image validation & processing
  // ---------------------------------------------------------------------------

  /**
   * Validate that a string looks like a base64 data URI we can use.
   * @param {string} str
   * @returns {boolean}
   */
  function isValidDataURI(str) {
    return typeof str === 'string'
      && str.startsWith('data:image/')
      && str.length > 50
      && str.length < IMAGE_POOL_CONFIG.MAX_FILE_SIZE * 1.5; // base64 ~33% larger
  }

  /**
   * Fisher-Yates shuffle (in-place).
   * @template T
   * @param {T[]} arr
   * @returns {T[]} the same array
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Compress an image data URI to a smaller size suitable for long-term storage.
   * Resizes to max 1200px on the longest side, exports as JPEG at quality 0.65.
   * A 12MP phone photo (~5 MB base64) compresses to ~80–150 KB.
   *
   * @param {string} dataUrl - source data URI
   * @returns {Promise<string>} compressed JPEG data URI
   */
  function compressOriginal(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode for compression'));
      img.onload = () => {
        try {
          const maxDim = IMAGE_POOL_CONFIG.ORIG_MAX_DIMENSION;
          let w = img.naturalWidth;
          let h = img.naturalHeight;

          if (w <= maxDim && h <= maxDim && dataUrl.length < 200 * 1024) {
            // Already small enough — return as-is
            resolve(dataUrl);
            return;
          }

          const scale = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', IMAGE_POOL_CONFIG.ORIG_JPEG_QUALITY));
        } catch (e) {
          reject(e);
        }
      };
      img.src = dataUrl;
    });
  }

  // ---------------------------------------------------------------------------
  // Mutation engine — applied at pick-time to make every output byte-unique
  // ---------------------------------------------------------------------------

  /** Cached offscreen canvas for mutateImage (400×300, constant size).
   *  Reusing a single canvas avoids repeated createElement + GC pressure on the
   *  hot path — pickImage() is called every time the camera interceptor
   *  activates (face verification modal opens). */
  let _mutationCanvas = null;

  /** @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }} */
  function getMutationCanvas() {
    if (!_mutationCanvas) {
      _mutationCanvas = document.createElement('canvas');
      _mutationCanvas.width = IMAGE_POOL_CONFIG.OUTPUT_WIDTH;
      _mutationCanvas.height = IMAGE_POOL_CONFIG.OUTPUT_HEIGHT;
    }
    const ctx = _mutationCanvas.getContext('2d');
    return { canvas: _mutationCanvas, ctx };
  }

  /**
   * Apply a random set of low-level mutations to a 400×300 image.
   * Each mutation has an independent activation chance → on average 2–4 fire.
   *
   * Transforms are composed into a SINGLE draw call (canvas filter + transform)
   * to avoid quality degradation from multi-pass rendering.
   *
   * Mutation catalogue (applied in composited order):
   *   brightness  : ×0.85–1.15
   *   contrast    : ×0.88–1.12
   *   saturation  : ×0.85–1.15
   *   hue         : ±4°
   *   flip        : horizontal mirror (50% dice)
   *   rotate      : ±2.5° (background filled black, draw 8% oversize)
   *   scale-jitter: ×1.00–1.06 per axis (independent, floor=1.0 prevents black borders)
   *   JPEG quality: 0.72–0.85 random
   *
   * Reuses a single offscreen canvas for all mutation calls to reduce GC pressure.
   *
   * @param {string} sourceDataUrl - the stored clean image
   * @returns {Promise<string>} mutated JPEG data URI
   */
  function mutateImage(sourceDataUrl) {
    return mutateImageWithMeta(sourceDataUrl).then((r) => r.dataUrl);
  }

  /**
   * Apply mutations to an image and return both the result and metadata
   * about which mutations were applied.
   *
   * @param {string} sourceDataUrl - the stored clean image
   * @returns {Promise<{dataUrl: string, mutations: Array<{type: string, label: string, value: string}>}>}
   */
  function mutateImageWithMeta(sourceDataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Mutation: failed to load source image'));
      img.onload = () => {
        try {
          const cfg = IMAGE_POOL_CONFIG;
          const targetW = cfg.OUTPUT_WIDTH;
          const targetH = cfg.OUTPUT_HEIGHT;

          const { canvas, ctx } = getMutationCanvas();

          // Background fill (handles rotation corners / scale shrink)
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, targetW, targetH);

          // ---- Gather mutations and track their values ----
          /** @type {string[]} */
          const active = [];
          /** @type {Array<{type: string, label: string, value: string}>} */
          const mutations = [];

          if (Math.random() < cfg.MUTATION_CHANCE_BRIGHTNESS) active.push('brightness');
          if (Math.random() < cfg.MUTATION_CHANCE_CONTRAST)   active.push('contrast');
          if (Math.random() < cfg.MUTATION_CHANCE_SATURATION) active.push('saturation');
          if (Math.random() < cfg.MUTATION_CHANCE_HUE)        active.push('hue');
          // Shuffle so the same <filter> string doesn't repeat often
          shuffle(active);

          // ---- Build CSS filter ----
          /** @type {string[]} */
          const filters = [];
          for (const m of active) {
            switch (m) {
              case 'brightness': {
                const v = lerp(cfg.MUTATION_BRIGHTNESS_RANGE, Math.random()).toFixed(2);
                filters.push(`brightness(${v})`);
                mutations.push({ type: 'brightness', label: '亮度', value: `×${v}` });
                break;
              }
              case 'contrast': {
                const v = lerp(cfg.MUTATION_CONTRAST_RANGE, Math.random()).toFixed(2);
                filters.push(`contrast(${v})`);
                mutations.push({ type: 'contrast', label: '对比度', value: `×${v}` });
                break;
              }
              case 'saturation': {
                const v = lerp(cfg.MUTATION_SATURATION_RANGE, Math.random()).toFixed(2);
                filters.push(`saturate(${v})`);
                mutations.push({ type: 'saturation', label: '饱和度', value: `×${v}` });
                break;
              }
              case 'hue': {
                const v = lerp(cfg.MUTATION_HUE_RANGE, Math.random()).toFixed(1);
                filters.push(`hue-rotate(${v}deg)`);
                mutations.push({ type: 'hue', label: '色相', value: `${v}°` });
                break;
              }
            }
          }
          if (filters.length > 0) {
            ctx.filter = filters.join(' ');
          }

          // ---- Build transform ----
          ctx.save();
          ctx.translate(targetW / 2, targetH / 2);

          const flip = Math.random() < cfg.MUTATION_CHANCE_FLIP ? -1 : 1;
          const jitter = Math.random() < cfg.MUTATION_CHANCE_SCALE_JITTER;
          const sx = flip * (jitter ? lerp(cfg.MUTATION_SCALE_RANGE, Math.random()) : 1);
          const sy = jitter ? lerp(cfg.MUTATION_SCALE_RANGE, Math.random()) : 1;

          const doRotate = Math.random() < cfg.MUTATION_CHANCE_ROTATE;
          const angle = doRotate
            ? lerp(cfg.MUTATION_ROTATE_RANGE, Math.random()) * Math.PI / 180
            : 0;

          ctx.transform(sx, 0, 0, sy, 0, 0);
          if (angle) ctx.rotate(angle);

          // Draw slightly larger when rotating so corners stay filled
          const margin = doRotate ? 1.08 : 1.0;
          ctx.drawImage(
            img,
            -targetW * margin / 2,
            -targetH * margin / 2,
            targetW * margin,
            targetH * margin,
          );
          ctx.restore();
          ctx.filter = 'none';

          // ---- Export with quality jitter ----
          const q = lerp(cfg.MUTATION_QUALITY_RANGE, Math.random()).toFixed(3);
          const dataUrl = canvas.toDataURL('image/jpeg', Number(q));

          // ---- Record transform mutations ----
          if (flip === -1) {
            mutations.push({ type: 'flip', label: '水平翻转', value: '是' });
          }
          if (doRotate) {
            mutations.push({ type: 'rotate', label: '旋转', value: `${angle.toFixed(1)}°` });
          }
          if (jitter) {
            mutations.push({ type: 'scale', label: '缩放', value: `×${sx.toFixed(2)} / ×${sy.toFixed(2)}` });
          }
          mutations.push({ type: 'quality', label: 'JPEG质量', value: `${Math.round(Number(q) * 100)}%` });

          resolve({ dataUrl, mutations });
        } catch (e) {
          reject(e);
        }
      };
      img.src = sourceDataUrl;
    });
  }

  /**
   * Linear interpolation in [range[0], range[1]].
   * @param {[number,number]} range
   * @param {number} t  0–1
   * @returns {number}
   */
  function lerp(range, t) {
    return range[0] + (range[1] - range[0]) * t;
  }

  /** Cached 9×8 offscreen canvas for dHash computation.  Reusing a single
   *  canvas avoids repeated createElement + GC pressure during batch uploads
   *  where computeDHash() is called for every file. */
  let _dHashCanvas = null;

  /**
   * Compute a 64-bit dHash (difference hash) from an Image element.
   * Returns a BigInt (0n – 0xFFFFFFFFFFFFFFFFn) or null on failure.
   *
   * Algorithm: shrink to 9×8, compare each pixel's luminance with its
   * right neighbour → 64 bits.
   *
   * @param {HTMLImageElement} img
   * @returns {bigint|null}
   */
  function computeDHash(img) {
    try {
      if (!_dHashCanvas) {
        _dHashCanvas = document.createElement('canvas');
        _dHashCanvas.width = 9;
        _dHashCanvas.height = 8;
      }
      const ctx = _dHashCanvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(img, 0, 0, 9, 8);
      const { data } = ctx.getImageData(0, 0, 9, 8);

      let hash = 0n;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const idx = (y * 9 + x) * 4;
          // Perceived luminance
          const lumA = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          const lumB = data[(y * 9 + x + 1) * 4] * 0.299
                     + data[(y * 9 + x + 1) * 4 + 1] * 0.587
                     + data[(y * 9 + x + 1) * 4 + 2] * 0.114;
          hash = (hash << 1n) | (lumA > lumB ? 1n : 0n);
        }
      }
      return hash;
    } catch (e) {
      debug('dHash computation failed:', e);
      return null;
    }
  }

  /**
   * Hamming distance between two BigInts (popcount of XOR).
   * @param {bigint} a
   * @param {bigint} b
   * @returns {number}
   */
  function hammingDistance(a, b) {
    let xor = a ^ b;
    let dist = 0;
    while (xor) {
      dist++;
      xor &= xor - 1n;
    }
    return dist;
  }

  /**
   * Process a File object into a pool-ready entry.
   * Returns the entry or null if the file is invalid / unreadable.
   *
   * @param {File} file
   * @param {bigint[]} existingHashes - hashes already in the pool
   * @returns {Promise<object|null>}
   */
  function processUploadedFile(file, existingHashes) {
    return new Promise((resolve) => {
      // 1. Size guard
      if (file.size > IMAGE_POOL_CONFIG.MAX_FILE_SIZE) {
        warn(`File "${file.name}" exceeds max size (${(file.size / 1e6).toFixed(1)}MB > ${IMAGE_POOL_CONFIG.MAX_FILE_SIZE / 1e6}MB), skipping`);
        return resolve(null);
      }

      // 2. MIME guard
      if (!IMAGE_POOL_CONFIG.ACCEPTED_TYPES.includes(file.type) && file.type !== '') {
        // Allow empty MIME (some systems don't set it) but reject known non-images
        if (file.type.startsWith('video/') || file.type.startsWith('audio/')
            || file.type.startsWith('application/') || file.type.startsWith('text/')) {
          warn(`File "${file.name}" is not an image (${file.type}), skipping`);
          return resolve(null);
        }
      }

      // 3. Read as data URL
      const reader = new FileReader();
      reader.onerror = () => {
        warn(`Failed to read file "${file.name}"`);
        resolve(null);
      };
      reader.onload = () => {
        const dataUrl = /** @type {string} */ (reader.result);

        // 4. Decode via Image to validate
        const img = new Image();
        img.onerror = () => {
          warn(`File "${file.name}" could not be decoded as an image, skipping`);
          resolve(null);
        };
        img.onload = async () => {
          // 5. Smart-crop to standard size (async: face-detection-aware)
          const { dataUrl: cropped, width, height, cropRect } = await smartCropToStandard(img);

          // 6. Compress original for quota-friendly storage
          let origDataUrl;
          try {
            origDataUrl = await compressOriginal(dataUrl);
          } catch (e) {
            warn(`Failed to compress original for "${file.name}":`, e);
            origDataUrl = null;
          }

          // 7. Perceptual hash for dedup
          const hash = computeDHash(img);
          if (hash !== null) {
            const threshold = IMAGE_POOL_CONFIG.DEDUP_HAMMING_THRESHOLD;
            const duplicate = existingHashes.some((h) => hammingDistance(h, hash) <= threshold);
            if (duplicate) {
              debug(`File "${file.name}" is a perceptual duplicate, skipping`);
              return resolve(null);
            }
          }

          debug(`Processed "${file.name}": ${file.size} → ${cropped.length} bytes, ${width}×${height}`);
          resolve({
            name: file.name,
            dataUrl: cropped,
            origDataUrl: origDataUrl,
            origWidth: img.naturalWidth,
            origHeight: img.naturalHeight,
            hash: hash ? hash.toString(16) : null,
            size: cropped.length,
            width,
            height,
            cropParams: origDataUrl ? cropRect : null,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Pool state & metadata
  // ---------------------------------------------------------------------------

  /**
   * @typedef {Object} PoolEntry
   * @property {number}  id       - stable index
   * @property {string}  name     - original filename
   * @property {string}  hash     - hex dHash string (or null)
   * @property {number}  size     - data URI length in bytes (cropped image)
   * @property {number}  width    - pixels (cropped, always 400)
   * @property {number}  height   - pixels (cropped, always 300)
   * @property {number}  addedAt  - epoch ms
   * @property {{sx:number,sy:number,sw:number,sh:number}|null} cropParams - source crop rectangle, null if unavailable
   * @property {number}  origWidth  - original (un-cropped) image width in px (after compression)
   * @property {number}  origHeight - original (un-cropped) image height in px (after compression)
   */

  /** @typedef {'high'|'neutral'|'low'} QualityTier */

  /**
   * @typedef {Object} ImageStats
   * @property {number}  totalUses    - number of times this image was picked
   * @property {number}  successes    - number of times it led to a passed verification
   * @property {number}  failures     - number of times it led to a failed verification
   * @property {number}  lastUsedAt   - epoch ms of last pick
   * @property {'success'|'fail'|null} lastResult - outcome of last verification attempt
   */

  /**
   * @typedef {Object} PoolMeta
   * @property {number}   version
   * @property {number}   nextId
   * @property {PoolEntry[]} entries
   */

  /** In-memory metadata cache */
  let _meta = { version: 1, nextId: 0, entries: [] };

  /** In-memory stats cache — { [id: number]: ImageStats } */
  let _stats = {};

  /** ID of the most recently picked image (set by pickImage, read by recordLastPickResult). */
  let _lastPickedId = null;

  /**
   * ID of the most recently successful image — excluded from the next pick to
   * avoid back-to-back reuse of the same face.  Controlled by NO_REPEAT_ENABLED
   * and NO_REPEAT_MODE config.
   */
  let _lastSuccessId = null;

  /**
   * Set of all image IDs that passed verification in the current page session.
   * When NO_REPEAT_MODE is 'session', these IDs are excluded from all future
   * picks.  In-memory only — resets on page reload.
   * @type {Set<number>}
   */
  let _sessionSuccessIds = new Set();

  /** Whether init() has completed */
  let _ready = false;

  function imgKey(id) {
    return IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + id;
  }

  function imgOrigKey(id) {
    return IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + 'orig_' + id;
  }

  /**
   * Load metadata from storage.  If metadata is missing but image keys exist,
   * rebuild metadata from surviving keys (self-healing).
   */
  async function loadMeta() {
    const adapter = getStorageAdapter();
    const raw = await adapter.get(IMAGE_POOL_CONFIG.META_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.version === 'number'
            && typeof parsed.nextId === 'number'
            && Array.isArray(parsed.entries)) {
          _meta = parsed;
          debug(`Image pool: loaded ${_meta.entries.length} entries (nextId=${_meta.nextId})`);
          return;
        }
      } catch (e) {
        warn('Image pool: metadata corrupted, attempting rebuild');
      }
    }

    // Self-heal: scan for orphaned image keys
    const allKeys = await adapter.keys();
    const prefix = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX;
    const orphanIds = allKeys
      .filter((k) => k.startsWith(prefix) && k !== IMAGE_POOL_CONFIG.META_KEY && !k.includes('orig_'))
      .map((k) => {
        const idStr = k.slice(prefix.length);
        const id = parseInt(idStr, 10);
        return Number.isFinite(id) ? id : -1;
      })
      .filter((id) => id >= 0)
      .sort((a, b) => a - b);

    if (orphanIds.length > 0) {
      info(`Image pool: found ${orphanIds.length} orphaned images, rebuilding metadata`);
      const entries = [];
      for (const id of orphanIds) {
        const data = await adapter.get(imgKey(id));
        if (data && isValidDataURI(data)) {
          entries.push({
            id,
            name: `recovered_${id}`,
            hash: null,
            size: data.length,
            width: 0,
            height: 0,
            addedAt: Date.now(),
            cropParams: null,
            origWidth: 0,
            origHeight: 0,
          });
        } else {
          // Dead key — clean up
          await adapter.remove(imgKey(id));
        }
      }
      _meta = {
        version: 1,
        nextId: orphanIds.length > 0 ? Math.max(...orphanIds) + 1 : 0,
        entries,
      };
      await persistMeta();
    } else {
      _meta = { version: 1, nextId: 0, entries: [] };
    }
  }

  /**
   * Write metadata to storage (best-effort).
   */
  async function persistMeta() {
    try {
      await getStorageAdapter().set(IMAGE_POOL_CONFIG.META_KEY, JSON.stringify(_meta));
    } catch (e) {
      warn('Image pool: failed to persist metadata:', e);
    }
  }

  /**
   * Remove an image key from storage (best-effort).
   */
  async function removeImageData(id) {
    try {
      await getStorageAdapter().remove(imgKey(id));
    } catch (e) {
      warn(`Image pool: failed to remove image ${id}:`, e);
    }
  }

  // ---------------------------------------------------------------------------
  // Stats tracking — per-image quality scoring
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh (zeroed) stats object for a new image.
   * @returns {ImageStats}
   */
  function createDefaultStats() {
    return { totalUses: 0, successes: 0, failures: 0, lastUsedAt: 0, lastResult: null };
  }

  /**
   * Load per-image stats from storage.  Self-heals: removes entries for
   * images that no longer exist in metadata.
   */
  async function loadStats() {
    const adapter = getStorageAdapter();
    const raw = await adapter.get(IMAGE_POOL_CONFIG.STATS_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Keep only stats for images that still exist
          const validIds = new Set(_meta.entries.map((e) => e.id));
          const cleaned = {};
          let removed = 0;
          for (const [idStr, s] of Object.entries(parsed)) {
            const id = Number(idStr);
            if (validIds.has(id) && s && typeof s.totalUses === 'number') {
              cleaned[id] = s;
            } else {
              removed++;
            }
          }
          _stats = cleaned;
          if (removed > 0) {
            debug(`Image pool stats: removed ${removed} orphaned entries`);
            await persistStats();
          } else {
            debug(`Image pool stats: loaded ${Object.keys(_stats).length} entries`);
          }
          return;
        }
      } catch (e) {
        warn('Image pool stats: corrupted, resetting');
      }
    }
    _stats = {};
  }

  /**
   * Write stats to storage (best-effort).
   */
  async function persistStats() {
    try {
      await getStorageAdapter().set(IMAGE_POOL_CONFIG.STATS_KEY, JSON.stringify(_stats));
    } catch (e) {
      warn('Image pool: failed to persist stats:', e);
    }
  }

  /**
   * Get or create stats for an image ID.
   * @param {number} id
   * @returns {ImageStats}
   */
  function getOrCreateStats(id) {
    if (!_stats[id]) {
      _stats[id] = createDefaultStats();
    }
    return _stats[id];
  }

  /**
   * Determine the quality tier for given stats.
   * @param {ImageStats} stats
   * @returns {QualityTier}
   */
  function getQualityTier(stats) {
    const cfg = IMAGE_POOL_CONFIG.QUALITY_SCORING;
    if (!stats || stats.totalUses < cfg.MIN_USES_FOR_ASSESSMENT) return 'neutral';

    const failRate = stats.failures / stats.totalUses;
    if (stats.failures >= cfg.LOW_QUALITY_FAILURE_THRESHOLD && failRate >= cfg.LOW_QUALITY_FAIL_RATE) {
      return 'low';
    }

    if (stats.totalUses >= cfg.HIGH_QUALITY_MIN_USES) {
      const successRate = stats.successes / stats.totalUses;
      if (successRate >= cfg.HIGH_QUALITY_SUCCESS_RATE) return 'high';
    }

    return 'neutral';
  }

  /**
   * Compute selection weights for all pool entries based on their quality tier.
   * Returns an array aligned with `_meta.entries`.  Every weight is strictly > 0.
   * @returns {number[]}
   */
  function computeWeights() {
    const cfg = IMAGE_POOL_CONFIG.QUALITY_SCORING;
    return _meta.entries.map((entry) => {
      const stats = _stats[entry.id] || createDefaultStats();
      const tier = getQualityTier(stats);
      switch (tier) {
        case 'high': return cfg.HIGH_QUALITY_WEIGHT;
        case 'low': return cfg.LOW_QUALITY_WEIGHT;
        default: return cfg.NEUTRAL_WEIGHT;
      }
    });
  }

  /**
   * Weighted random index into `_meta.entries`.
   * Falls back to uniform random if weights sum to zero (should not happen).
   * @param {number[]} weights
   * @returns {number} index into _meta.entries
   */
  function weightedRandomIndex(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return Math.floor(Math.random() * weights.length);

    let target = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      target -= weights[i];
      if (target <= 0) return i;
    }
    return weights.length - 1;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Force a full reload of the pool from storage.
   * Resets the ready flag so initPool() re-reads metadata and stats.
   * Used by import-export after writing directly to storage.
   *
   * @returns {Promise<void>}
   */
  async function reloadPool() {
    _ready = false;
    await initPool();
  }

  /**
   * Initialize the image pool.  Must be called once before any other operations.
   * Idempotent — subsequent calls are no-ops.
   *
   * @returns {Promise<void>}
   */
  async function initPool() {
    if (_ready) return;
    await loadMeta();
    await loadStats();
    _ready = true;
    info(`Image pool ready: ${_meta.entries.length}/${IMAGE_POOL_CONFIG.MAX_IMAGES} images`);
  }

  /**
   * How many images are currently in the pool?
   * @returns {number}
   */
  function poolSize() {
    return _meta.entries.length;
  }

  /**
   * Maximum capacity.
   * @returns {number}
   */
  function poolCapacity() {
    return IMAGE_POOL_CONFIG.MAX_IMAGES;
  }

  /**
   * Return a shallow copy of all pool entries (for UI rendering).
   * @returns {PoolEntry[]}
   */
  function listEntries() {
    return _meta.entries.slice();
  }

  /**
   * Pick a random image from the pool using weighted random selection.
   * High-quality images are boosted; low-quality images are down-weighted
   * but never fully excluded.  Falls back to uniform random if the pool
   * has no stats data yet.
   *
   * On every call the chosen image is run through mutateImage() so that
   * no two requests ever return the same bytes — brightness, contrast,
   * saturation, hue, flip, rotation, scale, and JPEG quality are all
   * randomized per invocation.
   *
   * Also records usage stats: increments totalUses and sets lastUsedAt
   * so that the quality scoring system can track per-image performance.
   *
   * @returns {Promise<string>} base64 JPEG data URI
   */
  async function pickImage() {
    if (_meta.entries.length === 0) {
      const err = new Error('Image pool is empty — cannot pick an image for replacement');
      err.code = 'POOL_EMPTY';
      throw err;
    }

    // ── No-repeat exclusion ──────────────────────────────────────────────
    // Avoid reusing faces that already passed verification this session.
    // Build a list of eligible entry indices; fall back to the full pool
    // if every image is excluded (tiny pool edge case).
    const excludeIds = new Set();
    {
      if (_lastSuccessId != null) excludeIds.add(_lastSuccessId);
      {
        for (const id of _sessionSuccessIds) excludeIds.add(id);
      }
    }

    /** @type {number[]} — indices into _meta.entries that are eligible for selection */
    let eligibleIndices = [];
    for (let i = 0; i < _meta.entries.length; i++) {
      if (!excludeIds.has(_meta.entries[i].id)) {
        eligibleIndices.push(i);
      }
    }

    const usingFallback = eligibleIndices.length === 0;
    if (usingFallback) {
      eligibleIndices = _meta.entries.map((_, i) => i);
    }

    const maxRetries = 3;
    const tried = new Set();

    // Compute weights once — they don't change during retries
    const useWeighted = getSetting('dynamicWeight', true);
    const weights = useWeighted ? computeWeights() : null;

    for (let attempt = 0; attempt < maxRetries && tried.size < eligibleIndices.length; attempt++) {
      // Weighted or uniform random selection over eligible indices
      let eligiblePos;
      do {
        if (useWeighted) {
          const eligibleWeights = eligibleIndices.map((i) => weights[i]);
          eligiblePos = weightedRandomIndex(eligibleWeights);
        } else {
          eligiblePos = Math.floor(Math.random() * eligibleIndices.length);
        }
      } while (tried.has(eligiblePos));
      tried.add(eligiblePos);

      const idx = eligibleIndices[eligiblePos];
      const entry = _meta.entries[idx];
      const adapter = getStorageAdapter();
      const raw = await adapter.get(imgKey(entry.id));

      if (raw && isValidDataURI(raw)) {
        // Record usage stats
        _lastPickedId = entry.id;
        const stats = getOrCreateStats(entry.id);
        const excludedNote = (usingFallback && excludeIds.has(entry.id)) ? ' (fallback — was excluded)' : '';
        info(`Picked image #${entry.id} "${entry.name}" (tier=${getQualityTier(stats)}, prevUses=${stats.totalUses}${excludedNote})`);
        stats.totalUses++;
        stats.lastUsedAt = Date.now();
        persistStats(); // fire-and-forget

        // Apply random mutations if enabled
        {
          try {
            const mutated = await mutateImage(raw);
            return mutated;
          } catch (e) {
            // Mutation failed — return the clean copy as fallback
            warn(`Mutation failed for "${entry.name}", returning clean copy:`, e);
            return raw;
          }
        }

        return raw;
      }

      // Stale/dead entry — evict
      warn(`Image ${entry.id} ("${entry.name}") data missing or invalid, evicting`);
      await removeImageData(entry.id);
      _meta.entries.splice(idx, 1);
      // Also remove stale stats
      delete _stats[entry.id];
      await persistMeta();
      await persistStats();
    }

    // All retries exhausted — every entry failed to load or validate
    warn(`All ${_meta.entries.length} pool images failed to load from storage — cannot pick an image`);
    const err = new Error('All pool images failed to load — storage may be corrupted or inaccessible');
    err.code = 'POOL_EMPTY';
    throw err;
  }

  /**
   * Add images from File objects to the pool.
   *
   * @param {File[]} files
   * @returns {Promise<{ added: PoolEntry[], skipped: number, duplicates: number }>}
   */
  async function addImages(files) {
    if (!_ready) await initPool();

    const existingHashes = _meta.entries
      .map((e) => {
        if (e.hash) {
          try { return BigInt('0x' + e.hash); } catch (_) { return null; }
        }
        return null;
      })
      .filter(Boolean);

    const results = { added: [], skipped: 0, duplicates: 0 };

    for (const file of files) {
      // Capacity check
      if (_meta.entries.length + results.added.length >= IMAGE_POOL_CONFIG.MAX_IMAGES) {
        warn(`Image pool full (${IMAGE_POOL_CONFIG.MAX_IMAGES}), skipping "${file.name}"`);
        results.skipped++;
        continue;
      }

      const processed = await processUploadedFile(file, [...existingHashes, ...results.added.map((e) => {
        if (e.hash) {
          try { return BigInt('0x' + e.hash); } catch (_) { return 0n; }
        }
        return 0n;
      }).filter((h) => h !== 0n)]);

      if (!processed) {
        results.skipped++;
        continue;
      }

      const id = _meta.nextId++;
      const entry = {
        id,
        name: processed.name,
        hash: processed.hash,
        size: processed.size,
        width: processed.width,
        height: processed.height,
        addedAt: Date.now(),
        cropParams: processed.cropParams || null,
        origWidth: processed.origWidth || 0,
        origHeight: processed.origHeight || 0,
      };

      // Persist cropped image (must succeed); original is best-effort
      try {
        await getStorageAdapter().set(imgKey(id), processed.dataUrl);
      } catch (e) {
        warn(`Failed to store cropped image "${file.name}":`, e);
        results.skipped++;
        continue;
      }

      // Store original — non-blocking: if it fails we keep the cropped image
      // but disable crop editing (cropParams stays null)
      if (processed.origDataUrl) {
        try {
          await getStorageAdapter().set(imgOrigKey(id), processed.origDataUrl);
        } catch (e) {
          warn(`Failed to store original for "${file.name}" (quota), crop editing disabled`);
          entry.cropParams = null;
        }
      } else {
        entry.cropParams = null;
      }

      _meta.entries.push(entry);
      results.added.push(entry);
      info(`Image "${file.name}" added to pool (id=${id}, ${processed.width}×${processed.height})`);
    }

    if (results.added.length > 0 || results.skipped > 0) {
      await persistMeta();
    }

    return results;
  }

  /**
   * Add a single image from a data URI (canvas capture, screenshot, etc.).
   * Skips the File/FileReader path — goes directly to decode → compress →
   * dHash dedup → storage.  Designed for programmatic frame capture from
   * &lt;video&gt; elements.
   *
   * @param {string} dataUrl - A base64 data URI (data:image/…)
   * @param {string} name    - Human-readable label (e.g. "captured_1712345678901")
   * @returns {Promise<PoolEntry|null>} The added entry, or null if rejected
   */
  async function addImageFromDataURI(dataUrl, name) {
    if (!_ready) await initPool();

    // 1. Quick sanity — must look like a data URI
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      warn('addImageFromDataURI: not a valid image data URI');
      return null;
    }

    if (dataUrl.length > IMAGE_POOL_CONFIG.MAX_FILE_SIZE * 2) {
      warn('addImageFromDataURI: data URI too large before compression, rejecting');
      return null;
    }

    // 2. Capacity check
    if (_meta.entries.length >= IMAGE_POOL_CONFIG.MAX_IMAGES) {
      warn('Image pool full, rejecting captured frame');
      return null;
    }

    // 3. Build existing hashes for dedup
    const existingHashes = _meta.entries
      .map((e) => {
        if (e.hash) {
          try { return BigInt('0x' + e.hash); } catch (_) { return null; }
        }
        return null;
      })
      .filter(Boolean);

    // 4. Decode, compress, dHash
    return new Promise((resolve) => {
      const img = new Image();
      img.onerror = () => {
        warn('addImageFromDataURI: failed to decode image');
        resolve(null);
      };
      img.onload = async () => {
        // Compress via smart-crop to standard dimensions (async: face-detection-aware)
        const { dataUrl: compressed, width, height, cropRect } = await smartCropToStandard(img);

        // Compress original for quota-friendly storage
        let origDataUrl;
        try {
          origDataUrl = await compressOriginal(dataUrl);
        } catch (e) {
          warn(`Failed to compress original for "${name}":`, e);
          origDataUrl = null;
        }

        // Perceptual dedup
        const hash = computeDHash(img);
        if (hash !== null) {
          const threshold = IMAGE_POOL_CONFIG.DEDUP_HAMMING_THRESHOLD;
          const duplicate = existingHashes.some((h) => hammingDistance(h, hash) <= threshold);
          if (duplicate) {
            debug(`Captured frame "${name}" is a perceptual duplicate, skipping`);
            return resolve(null);
          }
        }

        // 5. Allocate id & persist
        const id = _meta.nextId++;
        const entry = {
          id,
          name,
          hash: hash ? hash.toString(16) : null,
          size: compressed.length,
          width,
          height,
          addedAt: Date.now(),
          cropParams: (cropRect && origDataUrl) ? cropRect : null,
          origWidth: img.naturalWidth,
          origHeight: img.naturalHeight,
        };

        // Persist cropped image (must succeed)
        try {
          await getStorageAdapter().set(imgKey(id), compressed);
        } catch (e) {
          warn(`Failed to store captured image "${name}":`, e);
          return resolve(null);
        }

        // Store original — non-blocking: if it fails we keep the cropped image
        if (origDataUrl) {
          try {
            await getStorageAdapter().set(imgOrigKey(id), origDataUrl);
          } catch (e) {
            warn(`Failed to store original for "${name}" (quota), crop editing disabled`);
            entry.cropParams = null;
          }
        }

        _meta.entries.push(entry);
        await persistMeta();
        info(`Captured image "${name}" added to pool (id=${id}, ${width}×${height})`);
        resolve(entry);
      };
      img.src = dataUrl;
    });
  }

  /**
   * Remove a single image by its stable id.
   * @param {number} id
   * @returns {Promise<boolean>} true if removed
   */
  async function removeImage(id) {
    const idx = _meta.entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    const entry = _meta.entries[idx];
    await removeImageData(entry.id);
    try { await getStorageAdapter().remove(imgOrigKey(entry.id)); } catch (_) { /* ignore */ }
    _meta.entries.splice(idx, 1);
    // Clean up stats and no-repeat state for the removed image
    delete _stats[entry.id];
    if (_lastSuccessId === entry.id) _lastSuccessId = null;
    _sessionSuccessIds.delete(entry.id);
    await persistMeta();
    await persistStats();
    info(`Removed image "${entry.name}" (id=${id})`);
    return true;
  }

  /**
   * Remove all images from the pool.
   * @returns {Promise<void>}
   */
  async function clearPool() {
    const adapter = getStorageAdapter();

    for (const entry of _meta.entries) {
      await adapter.remove(imgKey(entry.id));
      try { await adapter.remove(imgOrigKey(entry.id)); } catch (_) { /* ignore */ }
    }

    _meta.entries = [];
    _meta.nextId = 0;
    _stats = {};
    _lastPickedId = null;
    _lastSuccessId = null;
    _sessionSuccessIds.clear();
    await persistMeta();
    await persistStats();
    info('Image pool cleared');
  }

  /**
   * Return the data URI for a specific entry (for thumbnail display).
   * @param {number} id
   * @returns {Promise<string|null>}
   */
  async function getImageData(id) {
    const raw = await getStorageAdapter().get(imgKey(id));
    return raw && isValidDataURI(raw) ? raw : null;
  }

  /**
   * Return the ORIGINAL (un-cropped) data URI for a specific entry.
   * @param {number} id
   * @returns {Promise<string|null>}
   */
  async function getOriginalImageData(id) {
    const raw = await getStorageAdapter().get(imgOrigKey(id));
    return raw && typeof raw === 'string' && raw.startsWith('data:image/') ? raw : null;
  }

  /**
   * Update the crop rectangle for an existing image, re-render the cropped
   * output, and persist everything back to storage.
   *
   * @param {number} id
   * @param {{sx:number, sy:number, sw:number, sh:number}} cropParams — new crop rect in source-pixel coordinates
   * @returns {Promise<boolean>} true if successful
   */
  async function updateCrop(id, cropParams) {
    const idx = _meta.entries.findIndex((e) => e.id === id);
    if (idx === -1) {
      warn(`updateCrop: image ${id} not found`);
      return false;
    }

    const origDataUrl = await getOriginalImageData(id);
    if (!origDataUrl) {
      warn(`updateCrop: original image data not found for ${id}`);
      return false;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onerror = () => {
        warn(`updateCrop: failed to decode original image for ${id}`);
        resolve(false);
      };
      img.onload = async () => {
        try {
          const { dataUrl, width, height } = renderCrop(img, cropParams);

          // Persist new cropped image
          await getStorageAdapter().set(imgKey(id), dataUrl);

          // Update metadata — sync origWidth/origHeight to the loaded image
          // dimensions so that on re-open the coordinate system matches.
          _meta.entries[idx].cropParams = { ...cropParams };
          _meta.entries[idx].size = dataUrl.length;
          _meta.entries[idx].width = width;
          _meta.entries[idx].height = height;
          _meta.entries[idx].origWidth = img.naturalWidth;
          _meta.entries[idx].origHeight = img.naturalHeight;
          await persistMeta();

          debug(`Crop updated for image ${id}: source (${cropParams.sx},${cropParams.sy}) ${cropParams.sw}×${cropParams.sh}`);
          resolve(true);
        } catch (e) {
          warn(`updateCrop: render failed for ${id}:`, e);
          resolve(false);
        }
      };
      img.src = origDataUrl;
    });
  }

  // ---------------------------------------------------------------------------
  // Stats public API — per-image quality tracking
  // ---------------------------------------------------------------------------

  /**
   * Record a verification result for a specific image.
   * Updates successes/failures/lastResult and persists stats.
   *
   * @param {number} id - Image ID
   * @param {boolean} success - Whether verification succeeded
   */
  function recordImageResult(id, success) {
    const stats = getOrCreateStats(id);
    if (success) {
      stats.successes++;
      stats.lastResult = 'success';
      // Track for no-repeat exclusion so this face won't be reused immediately
      _lastSuccessId = id;
      _sessionSuccessIds.add(id);
    } else {
      stats.failures++;
      stats.lastResult = 'fail';
    }
    // If lastUsedAt is 0 (never picked directly but result recorded), set now
    if (!stats.lastUsedAt) stats.lastUsedAt = Date.now();
    persistStats(); // fire-and-forget
    const tier = getQualityTier(stats);
    info(`Image ${id} verification: ${success ? '✓ SUCCESS' : '✗ FAIL'}  (totalUses=${stats.totalUses}, success=${stats.successes}/${stats.totalUses}, tier=${tier})`);
  }

  /**
   * Record a verification result for the most recently picked image.
   * Convenience wrapper — the processor doesn't know the exact image ID;
   * it just knows the current verification attempt succeeded or failed.
   *
   * @param {boolean} success
   */
  function recordLastPickResult(success) {
    if (_lastPickedId == null) {
      info('recordLastPickResult: no image was picked yet — cannot record result');
      return;
    }
    recordImageResult(_lastPickedId, success);
  }

  /**
   * Get the stats for a specific image.
   * @param {number} id
   * @returns {ImageStats|null}
   */
  function getImageStats(id) {
    return _stats[id] || null;
  }

  /**
   * Get stats for all images in the pool, keyed by ID.
   * Returns a fresh object — safe for UI rendering.
   * @returns {{ [id: number]: ImageStats }}
   */
  function getAllStats() {
    return { ..._stats };
  }

  /**
   * Reset the no-repeat exclusion state so all images are eligible for
   * picking again.  Call when starting a new course or when the user
   * explicitly requests a fresh verification cycle.
   *
   * Does NOT affect quality scores — only clears the in-memory exclusion
   * set (_lastSuccessId and _sessionSuccessIds).
   */
  function resetNoRepeatState() {
    const hadState = _lastSuccessId != null || _sessionSuccessIds.size > 0;
    _lastSuccessId = null;
    _sessionSuccessIds.clear();
    if (hadState) {
      debug('No-repeat state reset — all images are eligible again');
    }
  }

  /**
   * Get the quality tier for a specific image.
   * @param {number} id
   * @returns {QualityTier}
   */
  function getImageQualityTier(id) {
    const stats = _stats[id] || createDefaultStats();
    return getQualityTier(stats);
  }

  /**
   * @file CSS styles for the edge-drawer panel UI
   * All styles are injected as a <style> element at runtime.
   *
   * The panel uses an edge-drawer pattern: hidden off-screen to the right,
   * with only a 32px handle grip visible.  Hovering the handle slides the
   * full panel into view.  A pin button locks it open.
   */

  const STYLES = `
  /* ================================================================
   * Panel container — edge-drawer pattern
   * ================================================================ */

  .bfw-panel {
    position: fixed;
    z-index: 999999;
    right: 0;
    top: 0;
    height: 100vh;
    display: flex;
    flex-direction: row;
    /* Only the 32px handle is visible by default */
    transform: translateX(calc(100% - 32px));
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #cdd6f4;
    /* Allow clicks to pass through when fully hidden */
    pointer-events: none;
  }

  .bfw-panel.open,
  .bfw-panel.pinned {
    transform: translateX(0);
    pointer-events: auto;
  }

  /* While the handle is hovered, allow interaction */
  .bfw-panel:hover {
    pointer-events: auto;
  }

  /* ================================================================
   * Handle — the visible grip tab on the right edge
   * ================================================================ */

  .bfw-panel-handle {
    width: 32px;
    height: 120px;
    align-self: center;
    flex-shrink: 0;
    cursor: pointer;
    user-select: none;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;  /* Always clickable, even when panel is hidden */
  }

  /* The visible tab — a rounded rectangle */
  .bfw-panel-handle::before {
    content: '';
    position: absolute;
    inset: 0;
    left: 3px;
    background: linear-gradient(180deg,
      rgba(30, 30, 46, 0.92),
      rgba(49, 50, 68, 0.96) 20%,
      rgba(49, 50, 68, 0.96) 80%,
      rgba(30, 30, 46, 0.92));
    border: 1px solid rgba(137, 180, 250, 0.3);
    border-right: none;
    border-radius: 8px 0 0 8px;
    box-shadow: -2px 0 16px rgba(0, 0, 0, 0.3);
    transition: border-color 0.3s, box-shadow 0.3s;
  }

  /* Accent glow line */
  .bfw-panel-handle::after {
    content: '';
    position: absolute;
    left: 7px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 64px;
    background: linear-gradient(180deg, transparent, #89b4fa 20%, #74c7ec 80%, transparent);
    border-radius: 1px;
    box-shadow: 0 0 8px rgba(137, 180, 250, 0.6);
    transition: box-shadow 0.3s;
  }

  .bfw-panel-handle:hover::before {
    border-color: rgba(137, 180, 250, 0.6);
    box-shadow: -2px 0 20px rgba(137, 180, 250, 0.15);
  }

  .bfw-panel-handle:hover::after {
    box-shadow: 0 0 14px rgba(137, 180, 250, 0.9);
  }

  /* Vertical label text */
  .bfw-handle-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 12px;
    font-weight: 700;
    color: #89b4fa;
    letter-spacing: 6px;
    position: relative;
    z-index: 1;
    text-shadow: 0 0 8px rgba(137, 180, 250, 0.35);
    transition: color 0.3s, text-shadow 0.3s;
  }

  .bfw-panel-handle:hover .bfw-handle-text {
    color: #74c7ec;
    text-shadow: 0 0 12px rgba(137, 180, 250, 0.6);
  }

  /* ================================================================
   * Inner panel — the actual UI surface
   * ================================================================ */

  .bfw-panel-inner {
    width: 348px;
    flex-shrink: 0;
    background: #1e1e2e;
    border-left: 1px solid #313244;
    box-shadow: -4px 0 32px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* ================================================================
   * Header — title + pin button
   * ================================================================ */

  .bfw-panel-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 14px;
    background: linear-gradient(135deg, #89b4fa, #74c7ec);
    font-size: 13px;
    font-weight: 700;
    color: #1e1e2e;
  }

  .bfw-panel-header .bfw-header-actions {
    display: flex;
    gap: 4px;
  }

  .bfw-panel-header button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    color: #1e1e2e;
    padding: 2px 4px;
    border-radius: 4px;
    transition: background 0.15s;
  }

  /* Pin button — slightly larger to accommodate the SVG icon */
  .bfw-pin-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bfw-panel-header button:hover {
    background: rgba(30, 30, 46, 0.12);
  }

  /* ================================================================
   * Body — scrollable content area
   * ================================================================ */

  .bfw-panel-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 14px;
  }

  /* Custom scrollbar */
  .bfw-panel-body::-webkit-scrollbar {
    width: 5px;
  }

  .bfw-panel-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .bfw-panel-body::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
  }

  .bfw-panel-body::-webkit-scrollbar-thumb:hover {
    background: #585b70;
  }

  /* Firefox scrollbar */
  .bfw-panel-body {
    scrollbar-width: thin;
    scrollbar-color: #45475a transparent;
  }

  /* ================================================================
   * Status indicator
   * ================================================================ */

  .bfw-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0 10px;
    font-size: 12px;
  }

  .bfw-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #a6e3a1;
    flex-shrink: 0;
    box-shadow: 0 0 6px rgba(166, 227, 161, 0.5);
    transition: background 0.3s, box-shadow 0.3s;
  }

  .bfw-status-dot.inactive {
    background: #f38ba8;
    box-shadow: 0 0 6px rgba(243, 139, 168, 0.5);
  }

  /* ================================================================
   * Log area
   * ================================================================ */

  .bfw-log {
    margin-top: 6px;
    padding: 10px;
    background: #11111b;
    border-radius: 6px;
    font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
    font-size: 11px;
    line-height: 1.55;
    color: #a6adc8;
    height: 120px;
    overflow-y: auto;
  }

  .bfw-log::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-log::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-log .log-time {
    color: #585b70;
    margin-right: 4px;
  }

  /* ================================================================
   * Action buttons
   * ================================================================ */

  .bfw-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .bfw-btn {
    flex: 1;
    padding: 7px 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .bfw-btn:active {
    transform: scale(0.97);
  }

  .bfw-btn-primary {
    background: #89b4fa;
    color: #1e1e2e;
  }
  .bfw-btn-primary:hover {
    background: #74c7ec;
  }

  .bfw-btn-danger {
    background: #f38ba8;
    color: #1e1e2e;
  }
  .bfw-btn-danger:hover {
    background: #eba0ac;
  }

  .bfw-btn-ghost {
    background: transparent;
    color: #cdd6f4;
    border: 1px solid #45475a;
  }
  .bfw-btn-ghost:hover {
    background: #313244;
  }

  /* ================================================================
   * Image Pool section
   * ================================================================ */

  .bfw-pool-section {
    margin-top: 12px;
    border-top: 1px solid #313244;
    padding-top: 10px;
  }

  .bfw-pool-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .bfw-pool-header-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-pool-title {
    font-size: 12px;
    font-weight: 600;
    color: #bac2de;
  }

  .bfw-pool-count {
    font-size: 11px;
    color: #a6adc8;
    transition: color 0.2s;
  }

  .bfw-pool-drag-zone {
    border: 2px dashed #45475a;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
    font-size: 11px;
    color: #6c7086;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
    margin-bottom: 8px;
  }
  .bfw-pool-drag-zone:hover,
  .bfw-pool-drag-zone.drag-over {
    border-color: #89b4fa;
    background: rgba(137, 180, 250, 0.06);
    color: #89b4fa;
  }

  .bfw-pool-thumbs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 6px;
    max-height: 120px;
    overflow-y: auto;
    padding: 2px;
  }

  .bfw-pool-thumbs::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-pool-thumbs::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-pool-thumb {
    position: relative;
    aspect-ratio: 1;
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid #45475a;
    background: #11111b;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .bfw-pool-thumb:hover {
    border-color: #89b4fa;
    box-shadow: 0 0 8px rgba(137, 180, 250, 0.25);
  }

  /* ---- Quality tier border indicators ---- */

  /* Low-quality image: red/orange dashed border with subtle pulsing glow */
  .bfw-pool-thumb.bfw-quality-low {
    border-color: rgba(243, 139, 168, 0.55);
    border-style: dashed;
    box-shadow: 0 0 6px rgba(243, 139, 168, 0.15);
  }

  .bfw-pool-thumb.bfw-quality-low:hover {
    border-color: #f38ba8;
    box-shadow: 0 0 12px rgba(243, 139, 168, 0.35);
  }

  @keyframes bfw-pulse-warn {
    0%, 100% { box-shadow: 0 0 6px rgba(243, 139, 168, 0.12); }
    50%      { box-shadow: 0 0 12px rgba(243, 139, 168, 0.28); }
  }

  /* High-quality image: subtle green accent */
  .bfw-pool-thumb.bfw-quality-high {
    border-color: rgba(166, 227, 161, 0.4);
  }

  .bfw-pool-thumb.bfw-quality-high:hover {
    border-color: #a6e3a1;
    box-shadow: 0 0 8px rgba(166, 227, 161, 0.25);
  }
  .bfw-pool-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  /* Keep img behind absolute-positioned overlay buttons */
  .bfw-pool-thumb .bfw-thumb-delete {
    position: absolute;
    z-index: 1;
    top: 1px;
    right: 1px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(30, 30, 46, 0.85);
    border: none;
    color: #f38ba8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .bfw-pool-thumb:hover .bfw-thumb-delete {
    opacity: 1;
  }
  .bfw-pool-thumb .bfw-thumb-delete .bfw-icon {
    display: block;
    margin: 0;
    vertical-align: baseline;
  }
  .bfw-pool-thumb .bfw-thumb-delete:hover {
    background: #f38ba8;
    color: #1e1e2e;
  }

  /* Stats info button — appears on hover, same pattern as delete button */
  .bfw-pool-thumb .bfw-thumb-info {
    position: absolute;
    z-index: 1;
    top: 1px;
    left: 1px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(30, 30, 46, 0.85);
    border: none;
    color: #89b4fa;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .bfw-pool-thumb:hover .bfw-thumb-info {
    opacity: 1;
  }
  .bfw-pool-thumb .bfw-thumb-info .bfw-icon {
    display: block;
    margin: 0;
    vertical-align: baseline;
  }
  .bfw-pool-thumb .bfw-thumb-info:hover {
    background: #89b4fa;
    color: #1e1e2e;
  }

  /* ---- Stats popup (inline tooltip-style popover) ---- */

  .bfw-thumb-stats-popup {
    position: absolute;
    z-index: 9999999;
    width: 200px;
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 8px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
    padding: 10px 12px;
    font-size: 11px;
    color: #cdd6f4;
    pointer-events: auto;
    cursor: default;
  }

  .bfw-thumb-stats-popup .stats-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #313244;
  }

  .bfw-thumb-stats-popup .stats-name {
    font-weight: 600;
    font-size: 11px;
    color: #cdd6f4;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bfw-thumb-stats-popup .stats-tier-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .bfw-thumb-stats-popup .stats-tier-high {
    background: rgba(166, 227, 161, 0.15);
    color: #a6e3a1;
  }

  .bfw-thumb-stats-popup .stats-tier-neutral {
    background: rgba(137, 180, 250, 0.12);
    color: #89b4fa;
  }

  .bfw-thumb-stats-popup .stats-tier-low {
    background: rgba(243, 139, 168, 0.15);
    color: #f38ba8;
  }

  .bfw-thumb-stats-popup .stats-table {
    width: 100%;
    border-collapse: collapse;
  }

  .bfw-thumb-stats-popup .stats-table td {
    padding: 3px 0;
    font-size: 11px;
    line-height: 1.4;
  }

  .bfw-thumb-stats-popup .stats-label {
    color: #6c7086;
    width: 60px;
    white-space: nowrap;
  }

  .bfw-thumb-stats-popup .stats-value {
    color: #cdd6f4;
    text-align: right;
  }

  .bfw-thumb-stats-popup .stats-value.success {
    color: #a6e3a1;
  }

  .bfw-thumb-stats-popup .stats-value.fail {
    color: #f38ba8;
  }

  .bfw-thumb-stats-popup .stats-value.rate-good {
    color: #a6e3a1;
  }

  .bfw-thumb-stats-popup .stats-value.rate-bad {
    color: #f38ba8;
  }

  .bfw-thumb-stats-popup .stats-empty {
    text-align: center;
    color: #585b70;
    padding: 6px 0;
    font-size: 11px;
  }

  /* Blur toggle button */
  .bfw-eye-btn {
    background: none;
    border: none;
    color: #6c7086;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .bfw-eye-btn:hover {
    color: #cdd6f4;
    background: rgba(205, 214, 244, 0.08);
  }
  .bfw-eye-btn.active {
    color: #f38ba8;
  }

  /* Weight toggle button — same pattern as eye-btn */
  .bfw-weight-btn {
    background: none;
    border: none;
    color: #6c7086;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .bfw-weight-btn:hover {
    color: #cdd6f4;
    background: rgba(205, 214, 244, 0.08);
  }
  .bfw-weight-btn.active {
    color: #a6e3a1;
  }

  /* Blur mode — all thumbnails blurred */
  .bfw-pool-thumb img {
    transition: filter 0.15s;
  }
  .bfw-pool-thumbs.blur .bfw-pool-thumb img {
    filter: blur(8px);
  }
  /* Hover to reveal original */
  .bfw-pool-thumbs.blur .bfw-pool-thumb:hover img {
    filter: blur(0);
  }

  .bfw-pool-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .bfw-pool-actions .bfw-btn {
    font-size: 11px;
    padding: 5px 10px;
  }

  /* Capture button variant */
  .bfw-btn-capture {
    background: #a6e3a1;
    color: #1e1e2e;
    font-size: 11px;
    padding: 5px 10px;
    flex: 1;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .bfw-btn-capture:hover {
    background: #94e2d5;
  }
  .bfw-btn-capture:active {
    transform: scale(0.97);
  }
  .bfw-btn-capture:disabled {
    background: #585b70;
    color: #a6adc8;
    cursor: not-allowed;
  }

  .bfw-pool-empty {
    font-size: 11px;
    color: #585b70;
    text-align: center;
    padding: 10px 0;
  }

  .bfw-pool-status {
    font-size: 10px;
    color: #a6e3a1;
    margin-top: 6px;
    min-height: 14px;
    transition: color 0.2s;
  }
  .bfw-pool-status.error {
    color: #f38ba8;
  }

  /* ================================================================
   * Course Progress Section
   * ================================================================ */

  .bfw-course-section {
    padding: 8px 10px;
    background: #28283d;
    border-radius: 6px;
  }
  .bfw-course-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .bfw-course-title {
    font-size: 11px;
    color: #cdd6f4;
    font-weight: 600;
  }
  .bfw-course-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .bfw-course-count {
    font-size: 11px;
    color: #a6adc8;
    font-weight: 500;
  }
  .bfw-course-ch-label {
    font-size: 10px;
    color: #6c7086;
    display: none; /* hidden when zero, JS sets inline if wanted */
  }
  .bfw-course-current {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }
  .bfw-course-current-name {
    font-size: 11px;
    color: #89b4fa;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bfw-course-vid-pct {
    font-size: 10px;
    color: #a6adc8;
    flex-shrink: 0;
  }
  .bfw-course-chapter {
    font-size: 10px;
    color: #6c7086;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bfw-course-bar-group {
    margin-bottom: 4px;
  }
  .bfw-course-bar-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }
  .bfw-course-bar-label {
    font-size: 9px;
    color: #6c7086;
    width: 22px;
    text-align: left;
    flex-shrink: 0;
  }
  .bfw-course-bar-track {
    flex: 1;
    height: 4px;
    background: #45475a;
    border-radius: 2px;
    overflow: hidden;
  }
  .bfw-course-bar-fill {
    height: 100%;
    background: #89b4fa;
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  .bfw-bar-lesson {
    background: #a6e3a1;
  }
  .bfw-course-bar-pct {
    font-size: 9px;
    color: #a6adc8;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }
  .bfw-course-stat {
    font-size: 10px;
    color: #6c7086;
  }

  /* ================================================================
   * SVG Icons
   * ================================================================ */

  .bfw-icon {
    vertical-align: middle;
    flex-shrink: 0;
  }

  /* Gap between icon and text inside buttons */
  button > .bfw-icon + *,
  button > .bfw-icon ~ * {
    margin-left: 0;
  }

  button > .bfw-icon {
    margin-right: 4px;
  }

  button > .bfw-icon:last-child {
    margin-right: 0;
  }

  /* Spin animation for the clock / busy icon */
  @keyframes bfw-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .bfw-icon-spin {
    animation: bfw-spin 1.5s linear infinite;
    transform-origin: center center;
  }

  /* ================================================================
   * Settings section
   * ================================================================ */

  .bfw-settings-section {
    margin-top: 12px;
    border-top: 1px solid #313244;
    padding-top: 10px;
  }

  .bfw-settings-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .bfw-settings-title {
    font-size: 12px;
    font-weight: 600;
    color: #bac2de;
  }

  .bfw-setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(49, 50, 68, 0.4);
  }

  .bfw-setting-row:last-of-type {
    border-bottom: none;
  }

  .bfw-setting-row.bfw-setting-disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .bfw-setting-info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .bfw-setting-icon {
    display: flex;
    align-items: center;
    color: #89b4fa;
    flex-shrink: 0;
  }

  .bfw-setting-disabled .bfw-setting-icon {
    color: #585b70;
  }

  .bfw-setting-label {
    font-size: 12px;
    font-weight: 500;
    color: #cdd6f4;
  }

  .bfw-setting-desc {
    font-size: 10px;
    color: #585b70;
    flex-basis: 100%;
    margin-left: 22px; /* indent under icon */
  }

  /* ================================================================
   * Toggle switch (CSS-only, checkbox-driven)
   * ================================================================ */

  .bfw-toggle {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .bfw-setting-disabled .bfw-toggle {
    cursor: not-allowed;
  }

  .bfw-toggle-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .bfw-toggle-slider {
    position: absolute;
    inset: 0;
    background: #45475a;
    border-radius: 10px;
    transition: background 0.2s ease;
  }

  .bfw-toggle-slider::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: #cdd6f4;
    border-radius: 50%;
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .bfw-toggle-input:checked + .bfw-toggle-slider {
    background: #89b4fa;
  }

  .bfw-toggle-input:checked + .bfw-toggle-slider::before {
    transform: translateX(16px);
    background: #1e1e2e;
  }

  .bfw-toggle-input:disabled + .bfw-toggle-slider {
    background: #313244;
  }

  .bfw-toggle-input:disabled + .bfw-toggle-slider::before {
    background: #585b70;
  }

  /* Hover glow for active toggles */
  .bfw-toggle:not(:has(input:disabled)):hover .bfw-toggle-slider {
    box-shadow: 0 0 6px rgba(137, 180, 250, 0.4);
  }

  /* ================================================================
   * Video overlay — controls overlaid on the fake stream video element
   * ================================================================ */

  .bfw-video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-sizing: border-box;
  }

  .bfw-video-overlay *,
  .bfw-video-overlay *::before,
  .bfw-video-overlay *::after {
    box-sizing: border-box;
  }

  .bfw-video-overlay-btns {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: flex;
    gap: 8px;
    pointer-events: auto;
  }

  .bfw-overlay-btn {
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, opacity 0.15s;
    white-space: nowrap;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    line-height: 1;
  }

  .bfw-overlay-btn:active {
    transform: scale(0.95);
  }

  .bfw-overlay-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  .bfw-overlay-btn-refresh {
    background: rgba(30, 30, 46, 0.85);
    color: #cdd6f4;
    border: 1px solid rgba(137, 180, 250, 0.3);
  }

  .bfw-overlay-btn-refresh:hover:not(:disabled) {
    background: rgba(49, 50, 68, 0.92);
    border-color: rgba(137, 180, 250, 0.6);
  }

  .bfw-overlay-btn-toggle {
    background: rgba(137, 180, 250, 0.9);
    color: #1e1e2e;
    border: 1px solid transparent;
  }

  .bfw-overlay-btn-toggle:hover:not(:disabled) {
    background: rgba(116, 199, 236, 0.95);
  }

  .bfw-overlay-btn-toggle.mode-real {
    background: rgba(166, 227, 161, 0.9);
    color: #1e1e2e;
  }

  .bfw-overlay-btn-toggle.mode-real:hover:not(:disabled) {
    background: rgba(148, 226, 213, 0.95);
  }

  .bfw-overlay-mode-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
    transition: opacity 0.2s;
  }

  .bfw-overlay-mode-badge.mode-fake {
    background: rgba(137, 180, 250, 0.8);
    color: #1e1e2e;
  }

  .bfw-overlay-mode-badge.mode-real {
    background: rgba(166, 227, 161, 0.8);
    color: #1e1e2e;
  }

  /* ================================================================
   * Crop Editor — modal overlay for manual crop adjustment
   * ================================================================ */

  .bfw-ce-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .bfw-ce-modal {
    background: #1e1e2e;
    border: 1px solid #313244;
    border-radius: 10px;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 40px);
  }

  /* ---- Header ---- */

  .bfw-ce-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid #313244;
  }

  .bfw-ce-title {
    font-size: 13px;
    font-weight: 600;
    color: #cdd6f4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 320px;
  }

  .bfw-ce-close {
    background: none;
    border: none;
    color: #6c7086;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }

  .bfw-ce-close:hover {
    color: #f38ba8;
    background: rgba(243, 139, 168, 0.1);
  }

  /* ---- Body ---- */

  .bfw-ce-body {
    display: flex;
    gap: 12px;
    padding: 14px;
    overflow: hidden;
  }

  .bfw-ce-main {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ---- Display / canvas area ---- */

  .bfw-ce-display-wrapper {
    position: relative;
    background: #11111b;
    border-radius: 4px;
    overflow: hidden;
    user-select: none;
  }

  .bfw-ce-display-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  }

  /* Semi-transparent overlay that dims outside the crop box */
  .bfw-ce-crop-mask {
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
    border-radius: 1px;
  }

  /* ---- Crop box ---- */

  .bfw-ce-crop-box {
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #89b4fa;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 12px rgba(137, 180, 250, 0.3);
    cursor: move;
    z-index: 2;
    /* Grid overlay for composition guidance */
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px);
    background-size: calc(100% / 3) calc(100% / 3);
  }

  /* ---- Handles ---- */

  .bfw-ce-handle {
    position: absolute;
    background: #89b4fa;
    border: 2px solid #1e1e2e;
    box-sizing: border-box;
    border-radius: 2px;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
    z-index: 3;
    pointer-events: auto;
  }

  .bfw-ce-h-nw { top: -6px; left: -6px; cursor: nwse-resize; }
  .bfw-ce-h-ne { top: -6px; right: -6px; cursor: nesw-resize; }
  .bfw-ce-h-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
  .bfw-ce-h-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
  .bfw-ce-h-n  { top: -6px; left: calc(50% - 6px); cursor: ns-resize; }
  .bfw-ce-h-s  { bottom: -6px; left: calc(50% - 6px); cursor: ns-resize; }
  .bfw-ce-h-w  { left: -6px; top: calc(50% - 6px); cursor: ew-resize; }
  .bfw-ce-h-e  { right: -6px; top: calc(50% - 6px); cursor: ew-resize; }

  .bfw-ce-info {
    font-size: 11px;
    color: #a6adc8;
    margin-top: 6px;
  }

  /* ---- Sidebar (preview) ---- */

  .bfw-ce-sidebar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .bfw-ce-preview-label {
    font-size: 11px;
    color: #a6adc8;
    font-weight: 500;
  }

  .bfw-ce-preview-box {
    width: 72px;
    height: 54px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #45475a;
    background: #11111b;
  }

  .bfw-ce-preview-canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .bfw-ce-preview-size {
    font-size: 10px;
    color: #585b70;
  }

  /* ---- Footer ---- */

  .bfw-ce-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-top: 1px solid #313244;
    gap: 8px;
  }

  .bfw-ce-footer-right {
    display: flex;
    gap: 8px;
  }

  .bfw-ce-btn {
    padding: 7px 16px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .bfw-ce-btn:active {
    transform: scale(0.97);
  }

  .bfw-ce-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .bfw-ce-btn-reset {
    background: transparent;
    color: #a6adc8;
    border: 1px solid #45475a;
  }

  .bfw-ce-btn-reset:hover:not(:disabled) {
    background: #313244;
    color: #cdd6f4;
  }

  .bfw-ce-btn-cancel {
    background: transparent;
    color: #cdd6f4;
    border: 1px solid #45475a;
  }

  .bfw-ce-btn-cancel:hover:not(:disabled) {
    background: #313244;
  }

  .bfw-ce-btn-primary {
    background: #89b4fa;
    color: #1e1e2e;
  }

  .bfw-ce-btn-primary:hover:not(:disabled) {
    background: #74c7ec;
  }

  /* Responsive: stack vertically on narrow panels */
  @media (max-width: 600px) {
    .bfw-ce-body {
      flex-direction: column;
      align-items: center;
    }

    .bfw-ce-sidebar {
      flex-direction: row;
      gap: 8px;
    }
  }

  /* ================================================================
   * Progress Stats Section — learning history and aggregate stats
   * ================================================================ */

  .bfw-stats-section {
    margin-top: 14px;
    padding: 0;
    border-top: 1px solid rgba(69, 71, 90, 0.5);
  }

  .bfw-stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 10px 10px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
    border-radius: 6px 6px 0 0;
  }

  .bfw-stats-header:hover {
    background: rgba(49, 50, 68, 0.25);
  }

  .bfw-stats-title {
    font-weight: 600;
    font-size: 13px;
    color: #cdd6f4;
    display: flex;
    align-items: center;
    gap: 7px;
    letter-spacing: 0.3px;
  }

  .bfw-stats-toggle {
    background: none;
    border: none;
    color: #74c7ec;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
    pointer-events: none;
  }

  .bfw-stats-content {
    padding: 0 8px 14px;
    max-height: 600px;
    overflow-y: auto;
  }

  .bfw-stats-content::-webkit-scrollbar {
    width: 5px;
  }

  .bfw-stats-content::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
  }

  .bfw-stats-group {
    margin-bottom: 18px;
  }

  .bfw-stats-group-title {
    font-size: 11px;
    font-weight: 700;
    color: #74c7ec;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    padding-left: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-stats-group-title::before {
    content: '';
    width: 3px;
    height: 12px;
    background: linear-gradient(180deg, #89b4fa, #74c7ec);
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(116, 199, 236, 0.4);
  }

  /* ---- Weekly trend chart ---- */

  .bfw-trend-legend {
    display: flex;
    gap: 14px;
    margin-bottom: 6px;
    padding-left: 2px;
  }

  .bfw-legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: #a6adc8;
  }

  .bfw-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid;
    background: #1e1e2e;
    flex-shrink: 0;
  }

  .bfw-legend-dot-blue  { border-color: #89b4fa; }
  .bfw-legend-dot-green { border-color: #a6e3a1; }

  .bfw-trend-chart {
    position: relative;
    background: linear-gradient(135deg, rgba(49, 50, 68, 0.4) 0%, rgba(40, 40, 61, 0.5) 100%);
    border: 1px solid rgba(69, 71, 90, 0.5);
    border-radius: 8px;
    padding: 16px 12px 12px;
    overflow: hidden;
  }

  .bfw-trend-chart::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(137, 180, 250, 0.4), rgba(166, 227, 161, 0.4), transparent);
  }

  #bfw-trend-canvas {
    display: block;
    width: 100%;
    height: 140px;
  }

  /* ---- Summary cards grid ---- */

  .bfw-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }

  .bfw-stat-card {
    background: linear-gradient(135deg, rgba(49, 50, 68, 0.5) 0%, rgba(40, 40, 61, 0.6) 100%);
    border: 1px solid rgba(69, 71, 90, 0.6);
    border-radius: 8px;
    padding: 12px 10px;
    text-align: center;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .bfw-stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(137, 180, 250, 0.3), transparent);
  }

  .bfw-stat-card:hover {
    transform: translateY(-1px);
    border-color: rgba(137, 180, 250, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .stat-label {
    font-size: 10px;
    color: #a6adc8;
    margin-bottom: 6px;
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
  }

  /* ---- Recent sessions list ---- */

  .bfw-recent-sessions {
    max-height: 240px;
    overflow-y: auto;
    border-radius: 8px;
    background: rgba(17, 17, 27, 0.4);
    border: 1px solid rgba(69, 71, 90, 0.4);
  }

  .bfw-recent-sessions::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-recent-sessions::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-sessions-empty {
    padding: 20px 16px;
    text-align: center;
    color: #6c7086;
    font-size: 11px;
  }

  .bfw-session-item {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(69, 71, 90, 0.3);
    transition: background 0.15s;
    position: relative;
  }

  .bfw-session-item:last-child {
    border-bottom: none;
  }

  .bfw-session-item:hover {
    background: rgba(49, 50, 68, 0.3);
  }

  .bfw-session-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: linear-gradient(180deg, #89b4fa, #74c7ec);
    border-radius: 0 2px 2px 0;
    transition: height 0.2s;
  }

  .bfw-session-item:hover::before {
    height: 60%;
  }

  .session-name {
    font-size: 12px;
    font-weight: 600;
    color: #cdd6f4;
    margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-meta {
    font-size: 10px;
    color: #a6adc8;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .session-meta span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  /* ---- Courses breakdown list ---- */

  .bfw-courses-list {
    max-height: 280px;
    overflow-y: auto;
    border-radius: 8px;
    background: rgba(17, 17, 27, 0.4);
    border: 1px solid rgba(69, 71, 90, 0.4);
  }

  .bfw-courses-list::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-courses-list::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-courses-empty {
    padding: 20px 16px;
    text-align: center;
    color: #6c7086;
    font-size: 11px;
  }

  .bfw-course-item {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(69, 71, 90, 0.3);
    transition: background 0.15s;
    position: relative;
  }

  .bfw-course-item:last-child {
    border-bottom: none;
  }

  .bfw-course-item:hover {
    background: rgba(49, 50, 68, 0.3);
  }

  .course-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .course-name {
    font-size: 12px;
    font-weight: 600;
    color: #cdd6f4;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 8px;
  }

  .course-rate {
    font-size: 13px;
    font-weight: 700;
    background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    flex-shrink: 0;
    min-width: 38px;
    text-align: right;
  }

  .course-progress {
    margin-bottom: 8px;
  }

  .course-bar {
    height: 6px;
    background: rgba(45, 48, 71, 0.6);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }

  .course-bar::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.08) 50%,
      transparent);
    animation: bfw-shimmer 2s infinite;
    opacity: 0;
  }

  .course-bar:hover::before {
    opacity: 1;
  }

  @keyframes bfw-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .course-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #89b4fa 0%, #74c7ec 50%, #94e2d5 100%);
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 0 8px rgba(137, 180, 250, 0.3);
  }

  .course-bar-fill::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25));
    border-radius: 0 3px 3px 0;
  }

  .course-stats {
    font-size: 10px;
    color: #a6adc8;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .course-stat {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .course-stat::before {
    content: '·';
    color: #45475a;
    font-weight: 700;
  }

  .course-stat:first-child::before {
    content: none;
  }

  /* ---- Actions row ---- */

  .bfw-stats-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(69, 71, 90, 0.3);
  }

  .bfw-stats-actions .bfw-btn {
    flex: 1;
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 600;
  }

  /* ================================================================
   * Footer — minimal info bar at bottom of panel
   * ================================================================ */

  .bfw-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 24px;
    padding: 0 10px;
    background: rgba(0, 0, 0, 0.05);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    font-size: 11px;
    color: #a6adc8;
  }

  .bfw-footer-left {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .bfw-footer-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-footer-compat {
    display: inline-flex;
    align-items: center;
    cursor: help;
  }

  .bfw-footer-compat svg {
    display: block;
  }

  .bfw-footer-version {
    font-weight: 600;
    color: #89b4fa;
  }

  .bfw-footer-sep {
    color: #45475a;
  }

  .bfw-footer-page {
    color: #a6adc8;
  }

  .bfw-footer-link {
    display: inline-flex;
    align-items: center;
    color: #6c7086;
    text-decoration: none;
    line-height: 1;
    transition: color 0.15s, transform 0.1s;
    cursor: pointer;
  }

  .bfw-footer-link svg {
    display: block;
  }

  .bfw-footer-link:hover {
    color: #89b4fa;
    transform: scale(1.1);
  }

  /* ================================================================
   * Update badge — shown in footer-right when an update is available
   * ================================================================ */

  .bfw-update-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: none;
    border: none;
    padding: 2px 3px;
    border-radius: 4px;
    cursor: pointer;
    color: #a6adc8;
    font-size: 11px;
    line-height: 1;
    transition: color 0.2s, background 0.2s;
    position: relative;
  }

  .bfw-update-btn:hover {
    color: #cdd6f4;
    background: rgba(137, 180, 250, 0.08);
  }

  /* Spinning loader state */
  .bfw-update-btn.checking {
    color: #585b70;
    pointer-events: none;
  }

  /* Update available state — orange accent */
  .bfw-update-btn.has-update {
    color: #fab387;
    animation: bfw-update-pulse 2.5s ease-in-out infinite;
  }

  .bfw-update-btn.has-update:hover {
    color: #fe9057;
    background: rgba(250, 179, 135, 0.1);
    animation: none;
  }

  @keyframes bfw-update-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }

  /* ================================================================
   * Update changelog card — pops up above the footer
   * ================================================================ */

  .bfw-update-card {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    width: 300px;
    background: #1e1e2e;
    border: 1px solid rgba(250, 179, 135, 0.35);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(250, 179, 135, 0.08);
    z-index: 10;
    overflow: hidden;
    animation: bfw-card-in 0.18s cubic-bezier(0.2, 0, 0.2, 1);
    transform-origin: bottom right;
  }

  @keyframes bfw-card-in {
    from { opacity: 0; transform: scale(0.94) translateY(4px); }
    to   { opacity: 1; transform: scale(1)   translateY(0);    }
  }

  .bfw-update-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 8px;
    border-bottom: 1px solid rgba(49, 50, 68, 0.8);
  }

  .bfw-update-card-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #fab387;
  }

  .bfw-update-card-close {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: #585b70;
    display: inline-flex;
    align-items: center;
    border-radius: 3px;
    transition: color 0.15s, background 0.15s;
  }

  .bfw-update-card-close:hover {
    color: #cdd6f4;
    background: rgba(205, 214, 244, 0.08);
  }

  .bfw-update-card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px 0;
    font-size: 11px;
    color: #a6adc8;
  }

  .bfw-update-card-meta .version-badge {
    display: inline-flex;
    align-items: center;
  }

  /* Common visual badge style — used by both the <a> link and plain <span> */
  .bfw-version-badge-link {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: rgba(250, 179, 135, 0.12);
    color: #fab387;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 11px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s;
  }

  a.bfw-version-badge-link {
    cursor: pointer;
  }

  a.bfw-version-badge-link:hover {
    background: rgba(250, 179, 135, 0.22);
    color: #fab387;
  }

  .bfw-update-card-meta .arrow {
    color: #6c7086;
  }

  /* Changelog list inside the card */
  .bfw-update-changelog {
    padding: 8px 12px;
    max-height: 180px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #313244 transparent;
  }

  .bfw-update-changelog::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-update-changelog::-webkit-scrollbar-thumb {
    background: #313244;
    border-radius: 2px;
  }

  .bfw-update-changelog-empty {
    font-size: 11px;
    color: #585b70;
    padding: 4px 0;
  }

  .bfw-changelog-entry {
    display: flex;
    gap: 6px;
    padding: 3px 0;
    font-size: 11px;
    line-height: 1.4;
    border-bottom: 1px solid rgba(49, 50, 68, 0.5);
  }

  .bfw-changelog-entry:last-child {
    border-bottom: none;
  }

  .bfw-changelog-type {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 1px 5px;
    border-radius: 3px;
    align-self: flex-start;
    margin-top: 1px;
    text-transform: uppercase;
  }

  .bfw-type-feature    { background: rgba(137, 180, 250, 0.15); color: #89b4fa; }
  .bfw-type-fix        { background: rgba(243, 139, 168, 0.15); color: #f38ba8; }
  .bfw-type-improvement{ background: rgba(166, 227, 161, 0.15); color: #a6e3a1; }
  .bfw-type-performance{ background: rgba(249, 226, 175, 0.15); color: #f9e2af; }
  .bfw-type-security   { background: rgba(250, 179, 135, 0.15); color: #fab387; }
  .bfw-type-breaking   { background: rgba(243, 139, 168, 0.2);  color: #f38ba8; }
  .bfw-type-docs       { background: rgba(108, 112, 134, 0.2);  color: #6c7086; }
  .bfw-type-internal   { background: rgba(69, 71, 90, 0.4);     color: #45475a; }

  .bfw-changelog-text {
    color: #cdd6f4;
    flex: 1;
    min-width: 0;
  }

  .bfw-changelog-text .desc {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 10px;
    color: #6c7086;
    margin-top: 1px;
  }

  /* Card action buttons */
  .bfw-update-card-actions {
    display: flex;
    gap: 6px;
    padding: 8px 12px 10px;
    border-top: 1px solid rgba(49, 50, 68, 0.8);
  }

  .bfw-update-install-btn {
    flex: 1;
    background: rgba(250, 179, 135, 0.15);
    border: 1px solid rgba(250, 179, 135, 0.3);
    color: #fab387;
    border-radius: 5px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .bfw-update-install-btn:hover {
    background: rgba(250, 179, 135, 0.25);
    border-color: rgba(250, 179, 135, 0.5);
  }

  .bfw-update-ignore-btn {
    background: none;
    border: 1px solid rgba(69, 71, 90, 0.4);
    color: #6c7086;
    border-radius: 5px;
    padding: 5px 10px;
    font-size: 11px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .bfw-update-ignore-btn:hover {
    color: #a6adc8;
    border-color: #585b70;
  }

  .bfw-update-recheck-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #585b70;
    border-radius: 3px;
    padding: 2px;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
    margin-left: 2px;
  }

  .bfw-update-recheck-btn:hover {
    color: #a6adc8;
    background: rgba(137, 180, 250, 0.08);
  }

  /* ================================================================
   * Face Preview & Test modal
   * ================================================================ */

  .bfw-fp-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: bfw-fp-fadein 0.2s ease;
  }

  @keyframes bfw-fp-fadein {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .bfw-fp-modal {
    background: #1e1e2e;
    border: 1px solid #313244;
    border-radius: 12px;
    width: 680px;
    max-width: 95vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
    animation: bfw-fp-scalein 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: hidden;
  }

  @keyframes bfw-fp-scalein {
    from { transform: scale(0.92); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }

  /* ---- Header ---- */

  .bfw-fp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid #313244;
    flex-shrink: 0;
  }

  .bfw-fp-title {
    font-size: 14px;
    font-weight: 600;
    color: #cdd6f4;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bfw-fp-title .bfw-icon {
    color: #f9e2af;
  }

  .bfw-fp-close {
    background: none;
    border: none;
    color: #585b70;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
    display: flex;
    align-items: center;
  }

  .bfw-fp-close:hover {
    color: #f38ba8;
    background: rgba(243, 139, 168, 0.1);
  }

  /* ---- Body ---- */

  .bfw-fp-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .bfw-fp-main {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  /* ---- Mutation canvas ---- */

  .bfw-fp-mut-canvas {
    flex-shrink: 0;
    border-radius: 8px;
    border: 1px solid #313244;
    background: #11111b;
  }

  /* ---- Info panel ---- */

  .bfw-fp-info {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: #a6adc8;
  }

  .fp-info-loading {
    color: #6c7086;
    font-size: 13px;
    padding: 20px 0;
    text-align: center;
  }

  .fp-info-loading.error {
    color: #f38ba8;
  }

  .fp-info-name {
    font-size: 13px;
    font-weight: 600;
    color: #cdd6f4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }

  .fp-info-id-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  .fp-info-id {
    color: #585b70;
    font-size: 11px;
    font-family: monospace;
  }

  .fp-quality-tier {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
  }

  .fp-quality-high {
    color: #a6e3a1;
    background: rgba(166, 227, 161, 0.12);
  }

  .fp-quality-neutral {
    color: #a6adc8;
    background: rgba(166, 173, 200, 0.1);
  }

  .fp-quality-low {
    color: #f38ba8;
    background: rgba(243, 139, 168, 0.12);
  }

  .fp-pinned-badge {
    font-size: 10px;
    color: #f9e2af;
  }

  /* ---- Stats row ---- */

  .fp-info-stats {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .fp-stat {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
  }

  .fp-stat-label {
    color: #585b70;
  }

  .fp-stat-val {
    color: #cdd6f4;
    font-weight: 600;
  }

  .fp-stat-val.success { color: #a6e3a1; }
  .fp-stat-val.fail    { color: #f38ba8; }

  .fp-stat-empty {
    color: #585b70;
    font-size: 11px;
  }

  /* ---- Info sections ---- */

  .fp-info-section {
    margin-bottom: 10px;
  }

  .fp-section-title {
    font-size: 11px;
    font-weight: 600;
    color: #6c7086;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .fp-mutations-title {
    font-size: 11px;
    font-weight: 600;
    color: #6c7086;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .fp-mutations-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .fp-mut-tag {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(137, 180, 250, 0.1);
    color: #89b4fa;
    font-family: monospace;
  }

  .fp-mut-tag.muted {
    background: rgba(108, 112, 134, 0.15);
    color: #585b70;
  }

  /* ---- Detection summary ---- */

  .fp-detect-summary {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .fp-detect-tier {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 3px;
    font-weight: 600;
  }

  .fp-tier-native {
    color: #a6e3a1;
    background: rgba(166, 227, 161, 0.12);
  }

  .fp-tier-skin {
    color: #f9e2af;
    background: rgba(249, 226, 175, 0.12);
  }

  .fp-tier-fallback {
    color: #6c7086;
    background: rgba(108, 112, 134, 0.15);
  }

  .fp-detect-count {
    font-size: 11px;
    color: #a6adc8;
  }

  .fp-detect-count.none {
    color: #585b70;
  }

  /* ---- Detection panel (collapsible) ---- */

  .bfw-fp-detect-section {
    border: 1px solid #313244;
    border-radius: 8px;
    overflow: hidden;
  }

  .bfw-fp-detect-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    cursor: pointer;
    background: rgba(49, 50, 68, 0.3);
    transition: background 0.15s;
    user-select: none;
  }

  .bfw-fp-detect-header:hover {
    background: rgba(49, 50, 68, 0.5);
  }

  .bfw-fp-detect-header-text {
    font-size: 12px;
    font-weight: 600;
    color: #a6adc8;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-fp-detect-chevron {
    color: #585b70;
    transition: transform 0.2s ease;
    display: flex;
    align-items: center;
  }

  .bfw-fp-detect-body {
    display: none;
  }

  .bfw-fp-detect-section.open .bfw-fp-detect-body {
    display: block;
  }

  .bfw-fp-detect-wrapper {
    padding: 12px;
    display: flex;
    justify-content: center;
    background: #11111b;
  }

  .bfw-fp-detect-canvas {
    border-radius: 4px;
    max-width: 100%;
    height: auto;
  }

  /* ---- Toolbar ---- */

  .bfw-fp-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    border-top: 1px solid #313244;
    flex-shrink: 0;
    gap: 8px;
    flex-wrap: wrap;
  }

  .bfw-fp-toolbar-left,
  .bfw-fp-toolbar-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .bfw-fp-toolbar-sep {
    width: 1px;
    height: 18px;
    background: #313244;
    margin: 0 4px;
  }

  .bfw-fp-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border: 1px solid #313244;
    border-radius: 6px;
    background: rgba(49, 50, 68, 0.3);
    color: #a6adc8;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
    user-select: none;
  }

  .bfw-fp-btn:hover:not(:disabled) {
    background: rgba(49, 50, 68, 0.6);
    color: #cdd6f4;
    border-color: #45475a;
  }

  .bfw-fp-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .bfw-fp-btn .bfw-icon {
    flex-shrink: 0;
  }

  .bfw-fp-btn-pin.active {
    background: rgba(249, 226, 175, 0.12);
    border-color: rgba(249, 226, 175, 0.3);
    color: #f9e2af;
  }

  .bfw-fp-btn-remutate {
    color: #89b4fa;
    border-color: rgba(137, 180, 250, 0.25);
  }

  .bfw-fp-btn-remutate:hover:not(:disabled) {
    background: rgba(137, 180, 250, 0.12);
    border-color: rgba(137, 180, 250, 0.4);
  }

  .bfw-fp-btn-primary {
    background: rgba(137, 180, 250, 0.12);
    border-color: rgba(137, 180, 250, 0.3);
    color: #89b4fa;
    font-weight: 600;
  }

  .bfw-fp-btn-primary:hover:not(:disabled) {
    background: rgba(137, 180, 250, 0.2);
    border-color: rgba(137, 180, 250, 0.5);
  }

  /* ---- Preview button in pool header ---- */

  .bfw-preview-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid #313244;
    color: #a6adc8;
    border-radius: 4px;
    padding: 4px;
    cursor: pointer;
    transition: color 0.15s, background 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }

  .bfw-preview-btn:hover {
    color: #f9e2af;
    background: rgba(249, 226, 175, 0.1);
    border-color: rgba(249, 226, 175, 0.3);
  }

  /* ---- Data management row ---- */

  .bfw-data-mgmt {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .bfw-data-btn {
    flex: 1;
    font-size: 11px;
    padding: 6px 10px;
    justify-content: center;
    gap: 4px;
  }

  /* ================================================================
   * Import / Export modal — backup & restore ZIP dialog
   * ================================================================ */

  .bfw-ie-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: bfw-ie-fadein 0.2s ease;
  }

  @keyframes bfw-ie-fadein {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .bfw-ie-modal {
    background: #1e1e2e;
    border: 1px solid #313244;
    border-radius: 12px;
    width: 440px;
    max-width: 95vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
    animation: bfw-ie-scalein 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: hidden;
  }

  @keyframes bfw-ie-scalein {
    from { transform: scale(0.92); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }

  /* ---- Header ---- */

  .bfw-ie-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid #313244;
    flex-shrink: 0;
  }

  .bfw-ie-title {
    font-size: 14px;
    font-weight: 600;
    color: #cdd6f4;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bfw-ie-title .bfw-icon {
    color: #89b4fa;
  }

  .bfw-ie-close {
    background: none;
    border: none;
    color: #585b70;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
    display: flex;
    align-items: center;
  }

  .bfw-ie-close:hover {
    color: #f38ba8;
    background: rgba(243, 139, 168, 0.1);
  }

  /* ---- Body ---- */

  .bfw-ie-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ---- Summary / file info ---- */

  .bfw-ie-summary {
    background: #181825;
    border: 1px solid #313244;
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 12px;
    color: #a6adc8;
    line-height: 1.7;
  }

  .bfw-ie-summary .bfw-ie-file-icon {
    color: #89b4fa;
    margin-right: 6px;
  }

  .bfw-ie-summary-header {
    font-weight: 600;
    font-size: 13px;
    color: #cdd6f4;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ---- Section checkboxes ---- */

  .bfw-ie-section {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #181825;
    border: 1px solid #313244;
    border-radius: 8px;
    padding: 10px 14px;
    transition: border-color 0.15s;
  }

  .bfw-ie-section:hover {
    border-color: #45475a;
  }

  .bfw-ie-section.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  /* File pick area — used for both click-to-browse and drag-and-drop */
  .bfw-ie-file-pick {
    border: 2px dashed #45475a;
    border-radius: 10px;
    transition: border-color 0.2s, background 0.2s;
  }

  .bfw-ie-file-pick.dragover {
    border-color: #89b4fa;
    background: rgba(137, 180, 250, 0.08);
  }

  .bfw-ie-section-check {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    accent-color: #89b4fa;
    cursor: pointer;
  }

  .bfw-ie-section-icon {
    flex-shrink: 0;
    color: #6c7086;
    display: flex;
    align-items: center;
  }

  .bfw-ie-section-info {
    flex: 1;
    min-width: 0;
  }

  .bfw-ie-section-name {
    font-size: 13px;
    font-weight: 600;
    color: #cdd6f4;
  }

  .bfw-ie-section-detail {
    font-size: 11px;
    color: #6c7086;
    margin-top: 1px;
  }

  .bfw-ie-section-size {
    font-size: 11px;
    color: #585b70;
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* ---- Strategy selector (import only) ---- */

  .bfw-ie-section-strategy {
    flex-shrink: 0;
    display: flex;
    gap: 2px;
  }

  .bfw-ie-strategy-btn {
    font-size: 10px;
    padding: 3px 8px;
    background: #313244;
    border: 1px solid #45475a;
    color: #6c7086;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    font-family: inherit;
  }

  .bfw-ie-strategy-btn:hover {
    color: #a6adc8;
    border-color: #585b70;
  }

  .bfw-ie-strategy-btn.active {
    background: rgba(137, 180, 250, 0.15);
    border-color: #89b4fa;
    color: #89b4fa;
  }

  /* ---- Estimated size (export only) ---- */

  .bfw-ie-estimate {
    font-size: 12px;
    color: #6c7086;
    text-align: center;
    padding: 4px 0;
  }

  .bfw-ie-estimate strong {
    color: #a6adc8;
  }

  /* ---- Progress bar ---- */

  .bfw-ie-progress {
    display: none;
    flex-direction: column;
    gap: 6px;
  }

  .bfw-ie-progress.active {
    display: flex;
  }

  .bfw-ie-progress-bar {
    width: 100%;
    height: 8px;
    background: #313244;
    border-radius: 4px;
    overflow: hidden;
  }

  .bfw-ie-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #89b4fa, #74c7ec);
    border-radius: 4px;
    width: 0%;
    transition: width 0.3s ease;
    position: relative;
  }

  .bfw-ie-progress-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.15) 50%,
      transparent 100%
    );
    animation: bfw-ie-shimmer 1.5s ease-in-out infinite;
  }

  @keyframes bfw-ie-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .bfw-ie-progress-text {
    font-size: 11px;
    color: #6c7086;
    text-align: center;
  }

  /* ---- Error / warning banner ---- */

  .bfw-ie-errors {
    display: none;
    background: rgba(243, 139, 168, 0.1);
    border: 1px solid rgba(243, 139, 168, 0.3);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
    color: #f38ba8;
    line-height: 1.6;
  }

  .bfw-ie-errors.visible {
    display: block;
  }

  .bfw-ie-errors-title {
    font-weight: 600;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ---- Footer actions ---- */

  .bfw-ie-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 18px;
    border-top: 1px solid #313244;
    flex-shrink: 0;
  }

  .bfw-ie-btn {
    font-size: 12px;
    font-weight: 600;
    padding: 8px 18px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-ie-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .bfw-ie-btn-cancel {
    background: #313244;
    color: #a6adc8;
  }

  .bfw-ie-btn-cancel:hover:not(:disabled) {
    background: #45475a;
  }

  .bfw-ie-btn-primary {
    background: #89b4fa;
    color: #1e1e2e;
  }

  .bfw-ie-btn-primary:hover:not(:disabled) {
    background: #74c7ec;
  }

  .bfw-ie-btn-danger {
    background: rgba(243, 139, 168, 0.15);
    color: #f38ba8;
  }

  .bfw-ie-btn-danger:hover:not(:disabled) {
    background: rgba(243, 139, 168, 0.25);
  }

  /* ---- Result summary (post-import) ---- */

  .bfw-ie-result {
    display: none;
    flex-direction: column;
    gap: 8px;
  }

  .bfw-ie-result.visible {
    display: flex;
  }

  .bfw-ie-result-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    padding: 8px 12px;
    background: #181825;
    border-radius: 6px;
  }

  .bfw-ie-result-item.success { color: #a6e3a1; }
  .bfw-ie-result-item.warn    { color: #f9e2af; }
  .bfw-ie-result-item.error   { color: #f38ba8; }

  .bfw-ie-result-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
`;

  /**
   * @file SVG icon utilities — feather-based inline SVG icons.
   * All icons are stroke-based and inherit the parent's text color via
   * `stroke="currentColor"`.  They are sized consistently and can be
   * overridden with CSS.
   */

  /**
   * Build an inline SVG icon string.
   * @param {string} body - SVG body content (paths, circles, polylines, etc.)
   * @param {number} [size=16] - Icon size in logical pixels
   * @returns {string} Inline SVG markup
   */
  function svgIcon(body, size = 16) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="bfw-icon">${body}</svg>`;
  }

  const icons = {
    /** Map pin — general "pin / location" metaphor */
    pin:
      svgIcon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),

    /** Map pin with filled centre dot — "pinned / locked" state */
    pinFilled:
      svgIcon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="currentColor" stroke="none"/>'),

    /** Clapper board / film — video capture */
    film:
      svgIcon('<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>'),

    /** Clock — waiting / busy / capturing state */
    clock:
      svgIcon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),

    /** X / close — delete or dismiss */
    x:
      svgIcon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 14),

    /** Gear — settings */
    settings:
      svgIcon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>', 14),

    /** Toggle-right — on / active state */
    toggleOn:
      svgIcon('<rect x="1" y="5" width="22" height="14" rx="7" ry="7" fill="currentColor" opacity="0.2"/><circle cx="16" cy="12" r="5" fill="currentColor"/>', 20),

    /** Toggle-left — off / inactive state */
    toggleOff:
      svgIcon('<rect x="1" y="5" width="22" height="14" rx="7" ry="7" fill="currentColor" opacity="0.1"/><circle cx="8" cy="12" r="5" fill="currentColor" opacity="0.3"/>', 20),

    /** Book-open — course / lesson */
    book:
      svgIcon('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),

    /** User-check — face match */
    userCheck:
      svgIcon('<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>'),

    /** Video-camera — camera stream replacement */
    video:
      svgIcon('<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>'),

    /** Check-circle — auto-compare confirmation */
    checkCircle:
      svgIcon('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),

    /** Refresh/shuffle — swap the displayed pool image */
    refresh:
      svgIcon('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>'),

    /** Arrow-right — version arrow */
    arrowRight:
      svgIcon('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', 13),

    /** Camera toggle — switch between real and fake camera */
    cameraToggle:
      svgIcon('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/><line x1="3" y1="1" x2="21" y2="23"/>'),

    /** Info — circle with "i" used for per-image stats display */
    info:
      svgIcon('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>', 14),

    /** Eye-open — blur off / images visible */
    eye:
      svgIcon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),

    /** Eye-off — blur on / images hidden */
    eyeOff:
      svgIcon('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'),

    /** Monitor — visibility interception / screen detection bypass */
    monitor:
      svgIcon('<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'),

    /** Sliders — dynamic weight adjustment */
    sliders:
      svgIcon('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),

    /** Bar chart — statistics */
    barChart:
      svgIcon('<line x1="12" y1="2" x2="12" y2="22"/><path d="M18 5h-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/>'),

    /** Chevron down — collapse/expand indicator */
    chevronDown:
      svgIcon('<polyline points="6 9 12 15 18 9"/>', 14),

    /** Download — export data */
    download:
      svgIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),

    // Version checker status icons (Bootstrap Icons style)
    /** Check-circle — tested/compatible version */
    versionTested: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05"/></svg>`,

    /** Question-circle — unknown version */
    versionUnknown: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/></svg>`,

    /** X-circle — incompatible version */
    versionIncompatible: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>`,

    /** Exclamation-circle — missing version */
    versionMissing: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>`,

    /** GitHub logo */
    github: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>`,

    /** Arrow-up-circle — new version available */
    arrowUpCircle:
      svgIcon('<circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/>', 13),

    /** Loader / spinner — checking in progress */
    loader:
      svgIcon('<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>', 13),

    /** Zap / spark — re-apply mutations (lightning bolt metaphor) */
    sparkles:
      svgIcon('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),

    /** Crosshair / target — face detection visualization */
    crosshair:
      svgIcon('<circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>'),

    /** Send / paper plane — push mutated image to camera */
    send:
      svgIcon('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),

    /** Shuffle — random image selection */
    shuffle:
      svgIcon('<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>'),

    /** Chevron left — previous image */
    chevronLeft:
      svgIcon('<polyline points="15 18 9 12 15 6"/>'),

    /** Chevron right — next image */
    chevronRight:
      svgIcon('<polyline points="9 18 15 12 9 6"/>'),

    /** Tag — version label */
    tag:
      svgIcon('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>', 13),

    /** Archive/box — image pool backup section */
    archive:
      svgIcon('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>'),

    /** Database — progress data storage */
    database:
      svgIcon('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),

    /** File with text lines — backup document */
    fileText:
      svgIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),

    /** Folder-open — import file dialog */
    folderOpen:
      svgIcon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),

    /** Upload — import action */
    upload:
      svgIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'),

    /** Package / box — backup archive icon */
    package:
      svgIcon('<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),

    /** Alert triangle — warnings */
    alertTriangle:
      svgIcon('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  };

  /**
   * @file Video frame capture — extracts still frames from the face verification
   * video element for the manual "capture" button in the pool UI.
   *
   * Public API:
   *   findVideoElement(selectors)
   *   captureFrame(video, quality)
   *   isFrameUseful(dataUrl)
   */


  // ---------------------------------------------------------------------------
  // Video element discovery
  // ---------------------------------------------------------------------------

  /**
   * Known video players (course/content video) that should never be captured.
   * The face verification camera is a separate video element.
   */
  const PLAYER_VIDEO_SELECTORS = [
    '#player_html5_api',    // Video.js player
    '.vjs-tech',            // Video.js tech element
    '.pv-player',           // Polyv player
    '.plvideo',             // Polyv live video
    '.tcplayer',            // Tencent Cloud player
    '.prism-player',        // Alibaba Cloud player
    '[id*="player"]',       // Generic player id
    '[class*="player"]',    // Generic player class
  ];

  /**
   * Check if a video element matches known course-player selectors.
   * @param {HTMLVideoElement} video
   * @returns {boolean}
   */
  function isPlayerVideo(video) {
    for (const sel of PLAYER_VIDEO_SELECTORS) {
      try {
        if (video.matches(sel)) return true;
        // Also check ancestors — player videos are usually nested in player containers
        if (video.closest(sel)) return true;
      } catch (_) { /* invalid selector */ }
    }
    return false;
  }

  /**
   * Try each CSS selector in order and return the FIRST visible video element
   * with non-zero dimensions that is NOT a course player.
   *
   * Selectors are tried in order of priority — the first matching selector wins.
   * Only falls back to broader selectors if all higher-priority selectors fail.
   *
   * @param {string[]} selectors
   * @returns {HTMLVideoElement|null}
   */
  function findVideoElement(selectors) {
    if (!selectors || selectors.length === 0) {
      selectors = VIDEO_CAPTURE_SELECTORS;
    }

    // Two-pass approach:
    // Pass 1: Try high-priority selectors (#video, .main_content) first.
    //         Return the first non-player match immediately.
    // Pass 2: Only if pass 1 finds nothing, scan broader selectors but
    //         explicitly exclude player videos.

    const specificSelectors = ['#video', '.main_content'];
    const broadSelectors = selectors.filter(s => !specificSelectors.includes(s));

    // Pass 1: Specific camera selectors (priority)
    for (const sel of specificSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.tagName === 'VIDEO') {
          const video = /** @type {HTMLVideoElement} */ (el);
          const rect = video.getBoundingClientRect();
          if (rect.width > 10 && rect.height > 10 && isElementVisible(video)) {
            debug(`Video capture: found camera video via "${sel}" (${video.videoWidth}×${video.videoHeight})`);
            return video;
          }
        }
      } catch (_) { /* invalid CSS selector — skip */ }
    }

    // Pass 2: Broad selectors with player exclusion
    const candidates = [];

    for (const sel of broadSelectors) {
      try {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          if (el.tagName !== 'VIDEO') continue;
          const video = /** @type {HTMLVideoElement} */ (el);
          const rect = video.getBoundingClientRect();

          // Must be visible with meaningful dimensions
          if (!(rect.width > 10 && rect.height > 10 && isElementVisible(video))) continue;

          // Must NOT be a course player
          if (isPlayerVideo(video)) continue;

          candidates.push({ video, area: rect.width * rect.height });
        }
      } catch (_) { /* invalid CSS selector — skip */ }
    }

    if (candidates.length === 0) {
      debug('Video capture: no visible camera video element found');
      return null;
    }

    // Pick the SMALLEST video among candidates (camera feed is typically smaller
    // than any other video on the page).
    candidates.sort((a, b) => a.area - b.area);
    const chosen = candidates[0].video;
    debug(`Video capture: found camera video, ${chosen.videoWidth}×${chosen.videoHeight} (${candidates.length} candidate(s))`);
    return chosen;
  }

  /**
   * Check whether an element is visible (not display:none, not opacity:0, not
   * hidden via the `hidden` attribute, and not zero-size).
   *
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isElementVisible(el) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity) === 0) return false;
    if (el.hidden) return false;
    // Check ancestors aren't hidden
    let parent = el.parentElement;
    while (parent) {
      const ps = getComputedStyle(parent);
      if (ps.display === 'none' || ps.visibility === 'hidden') return false;
      parent = parent.parentElement;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Frame capture
  // ---------------------------------------------------------------------------

  /**
   * Capture the current frame of a &lt;video&gt; element as a JPEG data URI.
   *
   * Returns null if the video is not ready, has zero dimensions, or the canvas
   * is tainted (cross-origin media).
   *
   * @param {HTMLVideoElement} video
   * @param {number} [quality=0.85] - JPEG compression quality (0–1)
   * @returns {string|null} data:image/jpeg;base64,… or null
   */
  function captureFrame(video, quality = 0.85) {
    if (!video || video.tagName !== 'VIDEO') {
      warn('Video capture: invalid video element');
      return null;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh || vw < 10 || vh < 10) {
      debug(`Video capture: video not ready (${vw}×${vh})`);
      return null;
    }

    // Ensure video is in a playable state — capture the current frame even if paused
    try {
      const canvas = document.createElement('canvas');
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        warn('Video capture: failed to get 2d context');
        return null;
      }

      ctx.drawImage(video, 0, 0, vw, vh);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        debug(`Video capture: captured ${vw}×${vh} frame (${(dataUrl.length / 1024).toFixed(1)}KB)`);
        return dataUrl;
      } catch (taintErr) {
        warn('Video capture: canvas tainted — cannot export frame. Possible cross-origin media.');
        return null;
      }
    } catch (e) {
      warn('Video capture: drawImage failed —', e);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Frame quality validation
  // ---------------------------------------------------------------------------

  /**
   * Quick check: is the captured frame useful?
   *
   * Samples a grid of pixels across the image and rejects frames that are
   * almost entirely one colour (all-black, all-green placeholder, etc.).
   *
   * @param {string} dataUrl - A data:image/… URI
   * @returns {Promise<boolean>}
   */
  function isFrameUseful(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onerror = () => {
        debug('Video capture: frame quality check — failed to decode');
        resolve(false);
      };
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Sample at a reduced resolution
          canvas.width = Math.min(img.naturalWidth, 80);
          canvas.height = Math.min(img.naturalHeight, 60);
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(true); // If we can't check, let it through

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Sample every Nth pixel to build a colour histogram
          const stride = 4; // RGBA
          const seen = new Set();
          let nonBlack = 0;
          let total = 0;

          for (let i = 0; i < data.length; i += stride * 3) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const key = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); // 8×8×8 buckets
            seen.add(key);
            if (r > 20 || g > 20 || b > 20) nonBlack++;
            total++;
          }

          // Reject if nearly everything is black (camera not started)
          if (total > 10 && nonBlack / total < 0.05) {
            debug('Video capture: frame appears all-black, rejecting');
            return resolve(false);
          }

          // Reject if virtually no colour variation (blank placeholder)
          if (seen.size < 4 && total > 10) {
            debug(`Video capture: frame has too few distinct colours (${seen.size}), rejecting`);
            return resolve(false);
          }

          debug(`Video capture: frame quality OK (${seen.size} colour buckets, ${((nonBlack / total) * 100).toFixed(0)}% non-dark)`);
          resolve(true);
        } catch (e) {
          debug('Video capture: frame quality check error —', e);
          resolve(true); // Let it pass on error — don't block the pipeline
        }
      };
      img.src = dataUrl;
    });
  }

  /**
   * @file Face preview & test modal — lets the user preview post-mutation output,
   * inspect face detection geometry, and push custom images to the live camera feed.
   *
   * Features:
   *   - Real-time mutation preview (canvas render of mutateImageWithMeta output)
   *   - Per-mutation detail readout (brightness, contrast, flip, rotation, etc.)
   *   - Face detection visualization (bounding boxes, crop rect, attention point)
   *   - Image navigation (prev / next / random) with optional pin-to-lock
   *   - Push-to-camera: replace the live fake-stream image without tearing down the stream
   */


  // ---------------------------------------------------------------------------
  // Modal state
  // ---------------------------------------------------------------------------

  /**
   * @typedef {Object} FpState
   * @property {boolean}          pinned          — lock to current image ID
   * @property {number}           pinnedId        — the locked image ID (only valid when pinned)
   * @property {number}           currentIndex    — index into pool entries
   * @property {{dataUrl:string, mutations:Array}|null} currentMutated
   * @property {{faces:Array,tier:string,attentionPoint:{x,y},cropRect:Object}|null} detectionResult
   */

  /** @type {FpState} */
  let fpState = {
    pinned: false,
    pinnedId: -1,
    currentIndex: 0,
    currentMutated: null,
    detectionResult: null,
  };

  /** Current active DOM references. */
  let fpModal = null;
  let fpOrigImage = null; // Cached original Image element for face detection

  /**
   * Are we currently inside a render cycle?  Used to debounce rapid clicks.
   * @type {boolean}
   */
  let _rendering = false;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const TIER_LABELS = {
    skin: '🎨 肤色启发式',
    fallback: '📐 固定偏置',
  };

  const TIER_CSS = {
    skin: 'fp-tier-skin',
    fallback: 'fp-tier-fallback',
  };

  /** Escape HTML text. */
  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Render: mutation canvas
  // ---------------------------------------------------------------------------

  /**
   * Render the mutated image onto the preview canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {string} dataUrl
   */
  function renderMutatedCanvas(canvas, dataUrl) {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#11111b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }

  // ---------------------------------------------------------------------------
  // Render: face detection canvas (original image + overlay)
  // ---------------------------------------------------------------------------

  /**
   * Draw the original image with face-detection overlay:
   *   - Green rectangles: detected face bounding boxes
   *   - Yellow rectangle: crop region
   *   - Red dot: attention point
   *   - Semi-transparent dark mask outside crop region
   *
   * @param {HTMLCanvasElement} canvas - target canvas (max ~480px wide)
   * @param {HTMLImageElement} img - original source image
   * @param {{faces:Array|null, tier:string, attentionPoint:{x:number,y:number}|null, cropRect:{sx,sy,sw,sh}|null}} det
   */
  function renderDetectionCanvas(canvas, img, det) {
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    // Fit into display canvas while preserving aspect ratio
    const maxW = canvas.width;
    const maxH = canvas.height;
    const scale = Math.min(maxW / srcW, maxH / srcH, 1);
    const dispW = Math.round(srcW * scale);
    const dispH = Math.round(srcH * scale);
    const dx = Math.round((maxW - dispW) / 2);
    const dy = Math.round((maxH - dispH) / 2);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, maxW, maxH);

    // Background fill
    ctx.fillStyle = '#11111b';
    ctx.fillRect(0, 0, maxW, maxH);

    // Draw source image scaled to fit
    ctx.drawImage(img, dx, dy, dispW, dispH);

    if (!det) return;

    // Helper: source → display coordinates
    const toDisp = (sx, sy) => ({
      x: dx + sx * scale,
      y: dy + sy * scale,
    });
    const toDispDim = (sw, sh) => ({
      w: sw * scale,
      h: sh * scale,
    });

    // ---- Face bounding boxes (green) ----
    if (det.faces && det.faces.length > 0) {
      ctx.strokeStyle = 'rgba(166, 227, 161, 0.85)'; // Catppuccin green
      ctx.lineWidth = 2;
      for (const f of det.faces) {
        const d = toDisp(f.x, f.y);
        const dim = toDispDim(f.width, f.height);
        ctx.strokeRect(d.x, d.y, dim.w, dim.h);
      }
    }

    // ---- Crop rectangle (yellow) ----
    if (det.cropRect) {
      const { sx, sy, sw, sh } = det.cropRect;

      const cd = toDisp(sx, sy);
      const cdim = toDispDim(sw, sh);

      // Dim everything outside the crop rectangle via evenodd clip
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, dispW, dispH);
      ctx.rect(cd.x, cd.y, cdim.w, cdim.h);
      ctx.clip('evenodd');
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(dx, dy, dispW, dispH);
      ctx.restore();

      // Yellow dashed border around crop region
      ctx.strokeStyle = 'rgba(249, 226, 175, 0.9)'; // Catppuccin yellow
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(cd.x, cd.y, cdim.w, cdim.h);
      ctx.setLineDash([]);
    }

    // ---- Attention point (red dot) ----
    if (det.attentionPoint) {
      const ap = toDisp(det.attentionPoint.x, det.attentionPoint.y);
      ctx.fillStyle = 'rgba(243, 139, 168, 0.9)'; // Catppuccin red
      ctx.beginPath();
      ctx.arc(ap.x, ap.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------------------
  // Render: info panel (mutations, stats, tier)
  // ---------------------------------------------------------------------------

  /**
   * Populate the info panel with current state.
   * @param {HTMLElement} infoEl   - .bfw-fp-info container
   * @param {Object} entry         - pool entry
   * @param {Array}  mutations     - from mutateImageWithMeta
   * @param {{tier:string, faces:Array}|null} det - detection result
   */
  function renderInfoPanel(infoEl, entry, mutations, det) {
    const stats = getImageStats(entry.id);
    const tier = getImageQualityTier(entry.id);
    const tierLabels = { high: '高成功率', neutral: '中性', low: '低成功率' };
    const tierCss = { high: 'fp-quality-high', neutral: 'fp-quality-neutral', low: 'fp-quality-low' };

    let statsHtml = '';
    if (stats && stats.totalUses > 0) {
      const rate = stats.totalUses > 0
        ? Math.round((stats.successes / stats.totalUses) * 100)
        : 0;
      statsHtml = `
      <div class="fp-info-stats">
        <div class="fp-stat"><span class="fp-stat-label">使用</span><span class="fp-stat-val">${stats.totalUses}</span></div>
        <div class="fp-stat"><span class="fp-stat-label">成功</span><span class="fp-stat-val success">${stats.successes}</span></div>
        <div class="fp-stat"><span class="fp-stat-label">失败</span><span class="fp-stat-val fail">${stats.failures}</span></div>
        <div class="fp-stat"><span class="fp-stat-label">成功率</span><span class="fp-stat-val ${rate >= 50 ? 'success' : 'fail'}">${rate}%</span></div>
      </div>`;
    } else {
      statsHtml = '<div class="fp-info-stats"><div class="fp-stat-empty">暂无使用数据</div></div>';
    }

    let mutHtml = '';
    if (mutations && mutations.length > 0) {
      mutHtml = `<div class="fp-mutations-title">本次突变</div><div class="fp-mutations-list">`
        + mutations.map((m) => `<span class="fp-mut-tag" title="${esc(m.type)}">${esc(m.label)}: ${esc(m.value)}</span>`).join('')
        + '</div>';
    } else {
      mutHtml = '<div class="fp-mutations-title">本次突变</div><div class="fp-mutations-list"><span class="fp-mut-tag muted">无变化</span></div>';
    }

    let detectHtml = '';
    if (det) {
      detectHtml = `
      <div class="fp-detect-summary">
        <span class="fp-detect-tier ${TIER_CSS[det.tier]}">${TIER_LABELS[det.tier]}</span>
        ${det.faces && det.faces.length > 0
          ? `<span class="fp-detect-count">${det.faces.length} 个人脸</span>`
          : '<span class="fp-detect-count none">未检测到人脸</span>'}
      </div>`;
    }

    infoEl.innerHTML = `
    <div class="fp-info-name" title="${esc(entry.name)}">${esc(entry.name)}</div>
    <div class="fp-info-id-row">
      <span class="fp-info-id">#${entry.id}</span>
      <span class="fp-quality-tier ${tierCss[tier]}">${tierLabels[tier]}</span>
      ${fpState.pinned ? '<span class="fp-pinned-badge">📌 已固定</span>' : ''}
    </div>
    ${statsHtml}
    <div class="fp-info-section">
      ${mutHtml}
    </div>
    <div class="fp-info-section">
      <div class="fp-section-title">人脸检测</div>
      ${detectHtml}
    </div>
  `;
  }

  // ---------------------------------------------------------------------------
  // Core: load & render for a given pool entry
  // ---------------------------------------------------------------------------

  /**
   * Load the stored image, run mutations + face detection, and update all UI.
   *
   * @param {Object}          entry  - pool entry
   * @param {HTMLCanvasElement} mutCanvas
   * @param {HTMLCanvasElement} detCanvas
   * @param {HTMLElement}     infoEl
   */
  async function renderForEntry(entry, mutCanvas, detCanvas, infoEl) {
    if (_rendering) return;
    _rendering = true;

    // Show loading state
    const ctx = mutCanvas.getContext('2d');
    ctx.fillStyle = '#11111b';
    ctx.fillRect(0, 0, mutCanvas.width, mutCanvas.height);
    ctx.fillStyle = '#6c7086';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('加载中…', mutCanvas.width / 2, mutCanvas.height / 2);

    infoEl.innerHTML = '<div class="fp-info-loading">加载中…</div>';

    try {
      // 1. Load stored image data
      const dataUrl = await getImageData(entry.id);
      if (!dataUrl) {
        infoEl.innerHTML = '<div class="fp-info-loading error">图片数据丢失</div>';
        _rendering = false;
        return;
      }

      // 2. Apply mutations
      let mutated, mutations;
      try {
        const result = await mutateImageWithMeta(dataUrl);
        mutated = result.dataUrl;
        mutations = result.mutations;
      } catch (e) {
        // Mutation failed — use clean copy
        mutated = dataUrl;
        mutations = [];
        debug('Face preview: mutation failed, using clean copy:', e?.message || e);
      }
      fpState.currentMutated = { dataUrl: mutated, mutations };

      // 3. Load original image for face detection
      const origDataUrl = await getOriginalImageData(entry.id);
      if (origDataUrl) {
        fpOrigImage = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load original'));
          img.src = origDataUrl;
        });
      } else {
        // Fall back to cropped image
        fpOrigImage = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = dataUrl;
        });
      }

      // 4. Run face detection debug
      let detectionResult;
      try {
        detectionResult = await detectFacesDebug(fpOrigImage);
      } catch (e) {
        debug('Face preview: detection debug failed:', e?.message || e);
        detectionResult = null;
      }
      fpState.detectionResult = detectionResult;

      // 5. Render all canvases
      renderMutatedCanvas(mutCanvas, mutated);
      if (detCanvas) renderDetectionCanvas(detCanvas, fpOrigImage, detectionResult);

      // 6. Update info panel
      renderInfoPanel(infoEl, entry, mutations, detectionResult);

      // Update toolbar pin button state
      updatePinButton();
      updateNavButtons();
    } catch (e) {
      infoEl.innerHTML = `<div class="fp-info-loading error">加载失败: ${esc(e?.message || '未知错误')}</div>`;
      debug('Face preview: render failed:', e);
    } finally {
      _rendering = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  function getCurrentEntry() {
    const entries = listEntries();
    if (entries.length === 0) return null;
    const idx = Math.min(fpState.currentIndex, entries.length - 1);
    fpState.currentIndex = Math.max(0, idx);
    return entries[fpState.currentIndex];
  }

  async function navigateTo(direction) {
    const entries = listEntries();
    if (entries.length === 0) return;

    if (fpState.pinned) {
      // Still pinned — keep same image, no navigation
      return;
    }

    if (direction === 'prev') {
      fpState.currentIndex = (fpState.currentIndex - 1 + entries.length) % entries.length;
    } else if (direction === 'next') {
      fpState.currentIndex = (fpState.currentIndex + 1) % entries.length;
    } else if (direction === 'random') {
      fpState.currentIndex = Math.floor(Math.random() * entries.length);
    }

    const entry = entries[fpState.currentIndex];
    if (!entry) return;

    const mutCanvas = fpModal?.querySelector('.bfw-fp-mut-canvas');
    const detCanvas = fpModal?.querySelector('.bfw-fp-detect-canvas');
    const infoEl = fpModal?.querySelector('.bfw-fp-info');

    if (mutCanvas && infoEl) {
      await renderForEntry(entry, mutCanvas, detCanvas, infoEl);
    }
  }

  /**
   * Re-apply mutations.  Behaviour depends on pin state:
   *   - NOT pinned: pick a RANDOM new image, then apply mutations (full refresh).
   *   - Pinned:     keep the SAME image, only re-randomize the mutations.
   *
   * The pin feature exists precisely for this case — "I want to test different
   * mutation parameters on this specific face without switching images."
   */
  async function reMutate() {
    if (_rendering) return;

    if (!fpState.pinned) {
      // Full refresh: random image → mutations → face detection
      await navigateTo('random');
      return;
    }

    // Pinned: same image, new mutations, keep detection result
    const entry = getCurrentEntry();
    if (!entry) return;

    const mutCanvas = fpModal?.querySelector('.bfw-fp-mut-canvas');
    const infoEl = fpModal?.querySelector('.bfw-fp-info');

    if (mutCanvas && infoEl) {
      try {
        const dataUrl = await getImageData(entry.id);
        if (!dataUrl) return;

        let mutated, mutations;
        try {
          const result = await mutateImageWithMeta(dataUrl);
          mutated = result.dataUrl;
          mutations = result.mutations;
        } catch (e) {
          mutated = dataUrl;
          mutations = [];
        }
        fpState.currentMutated = { dataUrl: mutated, mutations };

        renderMutatedCanvas(mutCanvas, mutated);
        renderInfoPanel(infoEl, entry, mutations, fpState.detectionResult);
      } catch (e) {
        debug('Face preview: re-mutate failed:', e);
      }
    }
  }

  async function togglePin() {
    fpState.pinned = !fpState.pinned;

    const entry = getCurrentEntry();
    if (!entry) return;

    if (fpState.pinned) {
      fpState.pinnedId = entry.id;
    } else {
      fpState.pinnedId = -1;
    }

    updatePinButton();
    updateNavButtons();

    // Re-render info to show/hide the pin badge
    const infoEl = fpModal?.querySelector('.bfw-fp-info');
    if (infoEl && fpState.currentMutated) {
      renderInfoPanel(infoEl, entry, fpState.currentMutated.mutations, fpState.detectionResult);
    }
  }

  async function pushToCamera() {
    if (!fpState.currentMutated) return;

    const btn = fpModal?.querySelector('.bfw-fp-btn-push');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icons.clock} 推送中…`;
    }

    try {
      const ok = await pushImageToActiveStream(fpState.currentMutated.dataUrl);
      if (btn) {
        if (ok) {
          btn.innerHTML = `${icons.checkCircle} 已推送`;
          setTimeout(() => {
            btn.innerHTML = `${icons.send} 推送到摄像头`;
            btn.disabled = false;
          }, 2000);
        } else {
          btn.innerHTML = `${icons.send} 无活动流`;
          setTimeout(() => {
            btn.innerHTML = `${icons.send} 推送到摄像头`;
            btn.disabled = false;
          }, 2000);
        }
      }
    } catch (e) {
      if (btn) {
        btn.innerHTML = `${icons.send} 推送失败`;
        setTimeout(() => {
          btn.innerHTML = `${icons.send} 推送到摄像头`;
          btn.disabled = false;
        }, 2000);
      }
    }
  }

  function updatePinButton() {
    const pinBtn = fpModal?.querySelector('.bfw-fp-btn-pin');
    const mutBtn = fpModal?.querySelector('.bfw-fp-btn-remutate');

    if (pinBtn) {
      if (fpState.pinned) {
        pinBtn.classList.add('active');
        pinBtn.innerHTML = `${icons.pinFilled} 已固定`;
        pinBtn.title = '取消固定 — 恢复随机选择图片';
      } else {
        pinBtn.classList.remove('active');
        pinBtn.innerHTML = `${icons.pin} 固定此图`;
        pinBtn.title = '固定当前图片 — 只对此图重新突变';
      }
    }

    if (mutBtn) {
      if (fpState.pinned) {
        mutBtn.innerHTML = `${icons.sparkles} 重新突变`;
        mutBtn.title = '对此图重新应用随机突变 (图片不变)';
      } else {
        mutBtn.innerHTML = `${icons.shuffle} 随机换图`;
        mutBtn.title = '随机换一张图片并应用突变';
      }
    }
  }

  function updateNavButtons() {
    const prevBtn = fpModal?.querySelector('.bfw-fp-btn-prev');
    const nextBtn = fpModal?.querySelector('.bfw-fp-btn-next');
    const randomBtn = fpModal?.querySelector('.bfw-fp-btn-random');
    if (prevBtn) prevBtn.disabled = fpState.pinned;
    if (nextBtn) nextBtn.disabled = fpState.pinned;
    if (randomBtn) randomBtn.disabled = fpState.pinned;
  }

  // ---------------------------------------------------------------------------
  // Detection panel toggle
  // ---------------------------------------------------------------------------

  function toggleDetectionPanel() {
    const section = fpModal?.querySelector('.bfw-fp-detect-section');
    if (!section) return;

    const isOpen = section.classList.toggle('open');
    const chevron = section.querySelector('.bfw-fp-detect-chevron');
    if (chevron) {
      chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    // Trigger render on first open if needed
    if (isOpen && fpOrigImage && fpState.detectionResult) {
      const detCanvas = section.querySelector('.bfw-fp-detect-canvas');
      if (detCanvas) {
        renderDetectionCanvas(detCanvas, fpOrigImage, fpState.detectionResult);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // DOM factory
  // ---------------------------------------------------------------------------

  function createModalDOM$1() {
    const overlay = document.createElement('div');
    overlay.className = 'bfw-fp-overlay';

    const targetW = IMAGE_POOL_CONFIG.OUTPUT_WIDTH;
    const targetH = IMAGE_POOL_CONFIG.OUTPUT_HEIGHT;

    overlay.innerHTML = `
    <div class="bfw-fp-modal">
      <div class="bfw-fp-header">
        <span class="bfw-fp-title">${icons.sparkles} 人脸预览与测试</span>
        <button class="bfw-fp-close" title="关闭">${icons.x}</button>
      </div>

      <div class="bfw-fp-body">
        <div class="bfw-fp-main">
          <canvas class="bfw-fp-mut-canvas" width="${targetW}" height="${targetH}"></canvas>
          <div class="bfw-fp-info">
            <div class="fp-info-loading">加载中…</div>
          </div>
        </div>

        <div class="bfw-fp-detect-section">
          <div class="bfw-fp-detect-header">
            <span class="bfw-fp-detect-header-text">
              ${icons.crosshair} 人脸检测详情
            </span>
            <span class="bfw-fp-detect-chevron">${icons.chevronDown}</span>
          </div>
          <div class="bfw-fp-detect-body">
            <div class="bfw-fp-detect-wrapper">
              <canvas class="bfw-fp-detect-canvas" width="480" height="360"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="bfw-fp-toolbar">
        <div class="bfw-fp-toolbar-left">
          <button class="bfw-fp-btn bfw-fp-btn-prev" title="上一张">${icons.chevronLeft}</button>
          <button class="bfw-fp-btn bfw-fp-btn-next" title="下一张">${icons.chevronRight}</button>
          <button class="bfw-fp-btn bfw-fp-btn-random" title="随机选一张">${icons.shuffle}</button>
          <span class="bfw-fp-toolbar-sep"></span>
          <button class="bfw-fp-btn bfw-fp-btn-pin" title="固定当前图片">${icons.pin} 固定此图</button>
        </div>
        <div class="bfw-fp-toolbar-right">
          <button class="bfw-fp-btn bfw-fp-btn-remutate" title="重新应用随机突变">${icons.sparkles} 重新突变</button>
          <button class="bfw-fp-btn bfw-fp-btn-push bfw-fp-btn-primary" title="将当前突变图推送到活动的摄像头流">${icons.send} 推送到摄像头</button>
        </div>
      </div>
    </div>
  `;

    return overlay;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Open the face preview & test modal.
   */
  function openFacePreview() {
    // Already open? close and re-open to refresh
    if (fpModal) closeFacePreview();

    const entries = listEntries();
    if (entries.length === 0) {
      // No images in pool — nothing to preview
      return;
    }

    // Reset state
    fpState = {
      pinned: false,
      pinnedId: -1,
      currentIndex: Math.min(fpState.currentIndex, entries.length - 1),
      currentMutated: null,
      detectionResult: null,
    };
    fpOrigImage = null;
    _rendering = false;

    // Build and attach DOM
    fpModal = createModalDOM$1();
    document.body.appendChild(fpModal);

    // Cache element references
    const mutCanvas = fpModal.querySelector('.bfw-fp-mut-canvas');
    const detCanvas = fpModal.querySelector('.bfw-fp-detect-canvas');
    const infoEl = fpModal.querySelector('.bfw-fp-info');

    // Bind close
    const closeBtn = fpModal.querySelector('.bfw-fp-close');
    closeBtn.addEventListener('click', closeFacePreview);

    // Close via backdrop click
    fpModal.addEventListener('click', (e) => {
      if (e.target === fpModal) closeFacePreview();
    });

    // Close via Escape
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        // Don't close if an inner modal (e.g. crop editor) is open
        if (document.querySelector('.bfw-ce-overlay') || document.querySelector('.bfw-thumb-stats-popup')) return;
        closeFacePreview();
      }
    };
    document.addEventListener('keydown', onEsc);
    fpModal._onEsc = onEsc;

    // Toolbar button bindings
    fpModal.querySelector('.bfw-fp-btn-prev').addEventListener('click', () => navigateTo('prev'));
    fpModal.querySelector('.bfw-fp-btn-next').addEventListener('click', () => navigateTo('next'));
    fpModal.querySelector('.bfw-fp-btn-random').addEventListener('click', () => navigateTo('random'));
    fpModal.querySelector('.bfw-fp-btn-pin').addEventListener('click', togglePin);
    fpModal.querySelector('.bfw-fp-btn-remutate').addEventListener('click', reMutate);
    fpModal.querySelector('.bfw-fp-btn-push').addEventListener('click', pushToCamera);

    // Detection panel toggle
    fpModal.querySelector('.bfw-fp-detect-header').addEventListener('click', toggleDetectionPanel);

    // Initial render
    const entry = entries[fpState.currentIndex];
    if (entry && mutCanvas && infoEl) {
      renderForEntry(entry, mutCanvas, detCanvas, infoEl);
    }
  }

  /**
   * Close the face preview modal.
   */
  function closeFacePreview() {
    if (!fpModal) return;

    if (fpModal._onEsc) {
      document.removeEventListener('keydown', fpModal._onEsc);
    }
    fpModal.remove();
    fpModal = null;
    fpOrigImage = null;
    _rendering = false;
  }

  /**
   * @file UI event handlers — edge-drawer hover/pin, action buttons, image pool interactions.
   */


  // ---------------------------------------------------------------------------
  // Edge-drawer behaviour — hover to reveal, pin to lock
  // ---------------------------------------------------------------------------

  /**
   * Bind edge-drawer click-toggle / pin behaviour.
   *
   * - Click the handle: toggle panel open / close.
   * - Pin button: toggles pinned state — when pinned the panel stays open and
   *   Escape won't close it.  Clicking the handle while pinned unpins and
   *   closes in one action.
   * - Hover no longer triggers open / close.
   *
   * @param {HTMLElement} panel - The panel root element (`.bfw-panel`)
   */
  function bindDrawer(panel) {
    const handle = panel.querySelector('.bfw-panel-handle');
    const pinBtn = panel.querySelector('.bfw-pin-btn');

    if (!handle || !pinBtn) return;

    // ---- Handle click: toggle open / close ----

    handle.addEventListener('click', () => {
      const isOpen = panel.classList.contains('open');

      if (isOpen) {
        // Close — also unpin if currently pinned
        panel.classList.remove('open', 'pinned');
        pinBtn.innerHTML = icons.pin;
        pinBtn.title = '固定面板';
      } else {
        panel.classList.add('open');
      }
    });

    // ---- Pin toggle ----

    pinBtn.addEventListener('click', () => {
      const isPinned = panel.classList.toggle('pinned');

      if (isPinned) {
        pinBtn.innerHTML = icons.pinFilled;
        pinBtn.title = '取消固定';
        // Ensure panel is open when pinning
        panel.classList.add('open');
      } else {
        pinBtn.innerHTML = icons.pin;
        pinBtn.title = '固定面板';
        // Don't close on unpin — user may just want to allow toggle again
      }
    });

    // ---- Click outside to close (non-pinned only) ----
    // Use capture phase so the check runs before innerHTML mutations in
    // panel-internal handlers (e.g. eye toggle replaces its SVG children).

    document.addEventListener('click', (e) => {
      if (!panel.classList.contains('open') || panel.classList.contains('pinned')) return;
      // Don't close on clicks inside the panel or the crop editor modal
      if (panel.contains(e.target) || e.target.closest('.bfw-ce-overlay, .bfw-thumb-stats-popup')) return;
      panel.classList.remove('open');
    }, true);

    // ---- Escape key (non-pinned only) ----

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open') && !panel.classList.contains('pinned')) {
        // Don't close panel when a stats popup, crop editor, or face preview is open —
        // let their own Escape handlers dismiss them first.
        if (document.querySelector('.bfw-thumb-stats-popup') || document.querySelector('.bfw-ce-overlay') || document.querySelector('.bfw-fp-overlay')) return;
        panel.classList.remove('open');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Action button bindings
  // ---------------------------------------------------------------------------

  /**
   * Bind action buttons inside the panel.
   * @param {HTMLElement} panel - The panel root element
   */
  function bindActions(panel) {
    const retryBtn = panel.querySelector('#bfw-btn-retry');
    const clearBtn = panel.querySelector('#bfw-btn-clear');

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        // Dispatch a custom event that bubbles to document so the
        // auto-processor (which listens on document) can react.
        panel.dispatchEvent(new CustomEvent('bfw:retry', { bubbles: true }));
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const logArea = panel.querySelector('#bfw-log-area');
        if (logArea) logArea.innerHTML = '';
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Import / Export button bindings
  // ---------------------------------------------------------------------------

  /**
   * Bind import and export buttons in the data management section.
   * @param {HTMLElement} panel
   */
  function bindImportExport(panel) {
    const exportBtn = panel.querySelector('#bfw-btn-export-data');
    const importBtn = panel.querySelector('#bfw-btn-import-data');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        showExportModal();
      });
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => {
        showImportModal(panel);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Settings toggle bindings
  // ---------------------------------------------------------------------------

  /**
   * Bind toggle switches in the settings section.
   * Syncs DOM state ↔ settings.js state and reacts to external changes.
   * @param {HTMLElement} panel
   */
  function bindSettings(panel) {
    // Map DOM IDs to settings keys
    const bindings = [
      { inputId: 'bfw-toggle-face-autoclick', key: 'faceAutoClick' },
      { inputId: 'bfw-toggle-video-replace', key: 'videoReplace' },
      { inputId: 'bfw-toggle-auto-compare', key: 'autoCompare' },
      { inputId: 'bfw-toggle-auto-course', key: 'autoCourse' },
      { inputId: 'bfw-toggle-disable-visibility-check', key: 'disableVisibilityCheck' },
    ];

    for (const { inputId, key } of bindings) {
      const input = panel.querySelector(`#${inputId}`);
      if (!input) continue;

      // Read settings state into DOM
      input.checked = getSetting(key, false);

      // User toggles → update settings
      input.addEventListener('change', () => {
        setSetting(key, input.checked);
        updateSettingUI(panel, key, input.checked);
      });

      // React to programmatic setting changes
      onChange(key, (val) => {
        input.checked = val;
        updateSettingUI(panel, key, val);
      });
    }

    // Initial UI state sync
    for (const { key } of bindings) {
      updateSettingUI(panel, key, getSetting(key, false));
    }

    // ---- Dynamic weight setting sync (button, not checkbox) ----
    onChange('dynamicWeight', (val) => {
      const weightBtn = panel.querySelector('#bfw-btn-weight');
      if (weightBtn) {
        weightBtn.classList.toggle('active', val);
        weightBtn.title = val
          ? '动态权重: 开 — 根据图片成功率自动调整选中概率'
          : '动态权重: 关 — 所有图片等概率随机选取';
      }
    });
  }

  /**
   * Update the visual state of a setting row when its value changes.
   * @param {HTMLElement} panel
   * @param {string} key
   * @param {boolean} value
   */
  function updateSettingUI(panel, key, value) {
    const row = panel.querySelector(`.bfw-setting-row[data-setting="${key}"]`);
    if (!row) return;

    const toggleIcon = row.querySelector('.bfw-toggle-icon');
    if (toggleIcon) {
      toggleIcon.innerHTML = value ? icons.toggleOn : icons.toggleOff;
    }

    // Update status dot and text for settings
    if (key === 'faceAutoClick' || key === 'videoReplace' || key === 'autoCompare') {
      const fcOn = getSetting('faceAutoClick', true);
      const vrOn = getSetting('videoReplace', true);
      const acOn = getSetting('autoCompare', true);

      if (!fcOn && !vrOn) {
        setStatus(false, '已停止 — 所有功能已关闭');
      } else if (vrOn) {
        setStatus(true, '运行中 — 摄像头已替换');
      } else if (!fcOn) {
        setStatus(true, '运行中 — 仅替换画面 (自动点击已关闭)');
      } else if (!acOn) {
        setStatus(true, '运行中 — 拍照后暂停确认');
      } else {
        setStatus(true, '运行中 — 摄像头已替换');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Image pool event bindings
  // ---------------------------------------------------------------------------

  /**
   * Set a transient status message in the pool section.
   * @param {HTMLElement} panel
   * @param {string} msg
   * @param {'ok'|'error'} [kind='ok']
   */
  function poolStatus(panel, msg, kind = 'ok') {
    const el = panel.querySelector('#bfw-pool-status');
    if (!el) return;
    el.textContent = msg;
    el.className = `bfw-pool-status${kind === 'error' ? ' error' : ''}`;
    if (msg) {
      setTimeout(() => {
        if (el.textContent === msg) {
          el.textContent = '';
          el.className = 'bfw-pool-status';
        }
      }, 3000);
    }
  }

  /**
   * Bind all image-pool related events: upload, drag-drop, delete, clear.
   * @param {HTMLElement} panel
   */
  function bindPoolEvents(panel) {
    const dropZone = panel.querySelector('#bfw-pool-drop-zone');
    const fileInput = panel.querySelector('#bfw-pool-file-input');
    const uploadBtn = panel.querySelector('#bfw-btn-upload');
    const captureBtn = panel.querySelector('#bfw-btn-capture');
    const clearBtn = panel.querySelector('#bfw-btn-clear-pool');

    if (!dropZone || !fileInput) return;

    // ---- Blur toggle ----
    const eyeBtn = panel.querySelector('#bfw-btn-eye');
    const thumbsEl = panel.querySelector('#bfw-pool-thumbs');
    if (eyeBtn && thumbsEl) {
      eyeBtn.addEventListener('click', () => {
        const active = thumbsEl.classList.toggle('blur');
        eyeBtn.classList.toggle('active', active);
        eyeBtn.innerHTML = active ? icons.eyeOff : icons.eye;
        eyeBtn.title = active ? '显示原图' : '隐私模糊';
      });
    }

    // ---- Face preview button ----
    const previewBtn = panel.querySelector('#bfw-btn-preview');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        openFacePreview();
      });
    }

    // ---- Weight toggle ----
    const weightBtn = panel.querySelector('#bfw-btn-weight');
    if (weightBtn) {
      // Init from settings
      const weightOn = getSetting('dynamicWeight', true);
      weightBtn.classList.toggle('active', weightOn);
      weightBtn.title = weightOn
        ? '动态权重: 开 — 根据图片成功率自动调整选中概率'
        : '动态权重: 关 — 所有图片等概率随机选取';

      weightBtn.addEventListener('click', () => {
        const active = weightBtn.classList.toggle('active');
        weightBtn.title = active
          ? '动态权重: 开 — 根据图片成功率自动调整选中概率'
          : '动态权重: 关 — 所有图片等概率随机选取';
        setSetting('dynamicWeight', active);
      });
    }

    // ---- Upload trigger ----
    function openFilePicker() {
      fileInput.value = ''; // Allow re-uploading the same file
      fileInput.click();
    }

    dropZone.addEventListener('click', (e) => {
      // Don't trigger if user clicked the hidden input itself
      if (e.target === fileInput) return;
      openFilePicker();
    });

    if (uploadBtn) {
      uploadBtn.addEventListener('click', openFilePicker);
    }

    // ---- Capture button (video frame → pool) ----
    if (captureBtn) {
      captureBtn.addEventListener('click', async () => {
        // Defensive: don't allow double-clicks while capture is in progress
        if (captureBtn.disabled) return;
        captureBtn.disabled = true;
        captureBtn.innerHTML = `${icons.clock} 正在捕获…`;
        // Add spin animation to the clock icon
        const clockIcon = captureBtn.querySelector('.bfw-icon');
        if (clockIcon) clockIcon.classList.add('bfw-icon-spin');

        try {
          await handleCapture(panel);
        } finally {
          captureBtn.disabled = false;
          captureBtn.innerHTML = `${icons.film} 捕获`;
        }
      });
    }

    // ---- File selection ----
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (files.length > 0) {
        handleUpload(panel, files);
      }
    });

    // ---- Drag and drop ----
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        handleUpload(panel, files);
      }
    });

    // ---- Delete image (via custom event) ----
    panel.addEventListener('bfw:delete-image', async (e) => {
      const { id } = /** @type {CustomEvent} */ (e).detail;
      if (id == null) return;

      const ok = await removeImage(id);
      if (ok) {
        poolStatus(panel, '图片已移除');
        appendLog('图片已从图片池移除');
      }
      refreshPoolUI(panel);
    });

    // ---- Clear all ----
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const count = poolSize();
        if (count === 0) return;

        // Safety check — don't confirm if only 1 image
        if (count > 1) {
          const confirmed = confirm(`确定要删除图片池中全部 ${count} 张图片吗？`);
          if (!confirmed) return;
        }

        await clearPool();
        refreshPoolUI(panel);
        poolStatus(panel, '全部图片已清空');
        appendLog(`图片池已清空 (原有 ${count} 张)`);
      });
    }

    // ---- Stats popup dismissal — click outside closes it ----
    document.addEventListener('click', (e) => {
      // If there's a stats popup open and the click is not on an info button
      // or inside the popup itself, close it.
      const popup = document.querySelector('.bfw-thumb-stats-popup');
      if (!popup) return;
      if (popup.contains(e.target)) return;
      if (e.target.closest('.bfw-thumb-info')) return;
      hideStatsPopup();
    });

    // ---- Escape key dismissal ----
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideStatsPopup();
      }
    });
  }

  /**
   * Process and upload a batch of files to the image pool.
   * @param {HTMLElement} panel
   * @param {File[]} files
   */
  async function handleUpload(panel, files) {
    const cap = poolCapacity();
    const current = poolSize();

    if (current >= cap) {
      poolStatus(panel, `图片池已满 (${current}/${cap})。请先移除一些图片。`, 'error');
      return;
    }

    // Filter to images only (defensive — the input accept attr should catch most)
    const imageFiles = files.filter((f) =>
      f.type.startsWith('image/') || f.type === '',
    );

    if (imageFiles.length === 0) {
      poolStatus(panel, '未选择有效的图片文件', 'error');
      return;
    }

    poolStatus(panel, `正在处理 ${imageFiles.length} 张图片…`);

    try {
      const result = await addImages(imageFiles);

      // Refresh UI + log
      refreshPoolUI(panel);

      // Build status message
      const parts = [];
      if (result.added.length > 0) parts.push(`${result.added.length} 张已添加`);
      if (result.skipped > 0) parts.push(`${result.skipped} 张已跳过`);

      if (parts.length > 0) {
        const isError = result.added.length === 0;
        poolStatus(panel, parts.join(', '), isError ? 'error' : 'ok');
      }

      if (result.added.length > 0) {
        appendLog(`图片池: 已添加 ${result.added.length} 张图片 (${poolSize()}/${cap})`);
      }
      if (result.skipped > 0) {
        appendLog(`图片池: ${result.skipped} 个文件已跳过 (无效/重复/已满)`);
      }
    } catch (e) {
      poolStatus(panel, '上传失败 — 请查看控制台', 'error');
      console.error('Image pool upload error:', e);
    }
  }

  /**
   * Capture a frame from the video element and feed it into the image pool.
   * @param {HTMLElement} panel
   */
  async function handleCapture(panel) {
    const cap = poolCapacity();
    const current = poolSize();

    if (current >= cap) {
      poolStatus(panel, `图片池已满 (${current}/${cap})。请先移除一些图片。`, 'error');
      return;
    }

    // Reset interval gate so manual capture always works

    const video = findVideoElement(VIDEO_CAPTURE_SELECTORS);
    if (!video) {
      poolStatus(panel, '页面上未找到视频元素', 'error');
      return;
    }

    const dataUrl = captureFrame(video, IMAGE_POOL_CONFIG.JPEG_QUALITY);
    if (!dataUrl) {
      poolStatus(panel, '视频帧捕获失败', 'error');
      return;
    }

    poolStatus(panel, '已捕获帧 — 正在验证…');

    const useful = await isFrameUseful(dataUrl);
    if (!useful) {
      poolStatus(panel, '捕获的帧为空或无效 — 已跳过', 'error');
      return;
    }

    // Store in pool
    const ts = Date.now();
    const name = `captured_${ts}`;
    const entry = await addImageFromDataURI(dataUrl, name);

    if (!entry) {
      poolStatus(panel, '帧未保存 (重复/已满/存储错误)', 'error');
      return;
    }

    refreshPoolUI(panel);
    poolStatus(panel, `已捕获! ${entry.width}×${entry.height} → 图片池 (${poolSize()}/${cap})`);
    appendLog(`已捕获帧: ${entry.width}×${entry.height} → 图片池`);
  }

  /**
   * @file Crop editor — modal UI for manually adjusting image crop rectangles.
   *
   * Displays the original un-cropped image with a draggable, resizable 4:3
   * crop overlay.  Handles 8 resize grips (4 corners + 4 edge midpoints)
   * with aspect-ratio locking.  A live preview thumbnail shows the result
   * in real time.  On save, the re-cropped image is persisted back to the
   * image pool via updateCrop().
   */


  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------

  /** Current modal root — only one editor can be open at a time. */
  let activeModal = null;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Open the crop editor for a given pool entry.
   *
   * @param {number} entryId
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   * @param {Function} onSaved — callback when crop is saved (for refreshing pool UI)
   */
  async function openCropEditor(entryId, entry, onSaved) {
    // Close any existing editor
    if (activeModal) closeCropEditor();

    const cfg = CROP_EDITOR_CONFIG;

    // Validate that we have crop params
    if (!entry.cropParams) {
      // This shouldn't happen if the UI only enables click for entries with cropParams,
      // but guard defensively.
      return;
    }

    // Load original image
    const origDataUrl = await getOriginalImageData(entryId);
    if (!origDataUrl) {
      return;
    }

    // Decode original
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to decode original image'));
      el.src = origDataUrl;
    });

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    // The crop params were computed against the full-resolution original.
    // The stored original is compressed (max 1200px).  Scale the crop rect
    // to match the compressed image's coordinate space.
    /** @type {{sx:number,sy:number,sw:number,sh:number}} */
    let crop;
    const storedW = entry.origWidth || 0;
    const storedH = entry.origHeight || 0;
    if (storedW > 0 && storedH > 0 && (srcW !== storedW || srcH !== storedH)) {
      const scaleX = srcW / storedW;
      const scaleY = srcH / storedH;
      crop = {
        sx: entry.cropParams.sx * scaleX,
        sy: entry.cropParams.sy * scaleY,
        sw: entry.cropParams.sw * scaleX,
        sh: entry.cropParams.sh * scaleY,
      };
    } else {
      crop = { ...entry.cropParams };
    }

    // Compute display scale — fit within MAX_DISPLAY_SIZE
    const scale = Math.min(cfg.MAX_DISPLAY_SIZE / srcW, cfg.MAX_DISPLAY_SIZE / srcH, 1);
    const dispW = Math.round(srcW * scale);
    const dispH = Math.round(srcH * scale);

    // Build modal DOM
    const modal = createModalDOM(dispW, dispH, entry);
    activeModal = modal;
    document.body.appendChild(modal);

    // Cache references
    const displayImg = modal.querySelector('.bfw-ce-display-img');
    const cropBox = modal.querySelector('.bfw-ce-crop-box');
    const previewCanvas = modal.querySelector('.bfw-ce-preview-canvas');
    const previewCtx = previewCanvas.getContext('2d');
    const infoEl = modal.querySelector('.bfw-ce-info');

    displayImg.src = origDataUrl;

    // State for mouse interactions
    /** @type {'move'|'nw'|'ne'|'sw'|'se'|'n'|'s'|'w'|'e'|null} */
    let dragMode = null;
    let dragStart = { x: 0, y: 0, crop: null };

    // -----------------------------------------------------------------------
    // Coordinate helpers
    // -----------------------------------------------------------------------

    /** Convert source-pixel coords to display-space coords */
    function srcToDisp(r) {
      return {
        x: Math.round(r.sx * scale),
        y: Math.round(r.sy * scale),
        w: Math.round(r.sw * scale),
        h: Math.round(r.sh * scale),
      };
    }

    /** Clamp crop rect to source image bounds and ensure minimum size */
    function clampCrop(r) {
      const minPx = cfg.MIN_CROP_PX;
      let sx = Math.max(0, Math.min(r.sx, srcW - minPx));
      let sy = Math.max(0, Math.min(r.sy, srcH - minPx));
      let sw = Math.max(minPx, Math.min(r.sw, srcW - sx));
      let sh = Math.max(minPx, Math.min(r.sh, srcH - sy));

      // Re-enforce target ratio: adjust width to match height * ratio
      // Prefer shrinking width (more forgiving) over shrinking height
      const targetRatio = cfg.TARGET_RATIO;
      const adjustedW = sh * targetRatio;
      if (adjustedW <= srcW - sx) {
        sw = adjustedW;
      } else {
        sw = srcW - sx;
        sh = sw / targetRatio;
        if (sh > srcH - sy) {
          sh = srcH - sy;
          sw = sh * targetRatio;
        }
      }

      // Re-clamp
      if (sx + sw > srcW) { sx = srcW - sw; }
      if (sy + sh > srcH) { sy = srcH - sh; }
      if (sx < 0) { sx = 0; }
      if (sy < 0) { sy = 0; }

      return { sx, sy, sw, sh };
    }

    // -----------------------------------------------------------------------
    // UI update
    // -----------------------------------------------------------------------

    function updateCropBox() {
      const d = srcToDisp(crop);
      cropBox.style.left = `${d.x}px`;
      cropBox.style.top = `${d.y}px`;
      cropBox.style.width = `${d.w}px`;
      cropBox.style.height = `${d.h}px`;
    }

    /** Draw the crop result directly onto the preview canvas — no toDataURL. */
    function drawPreview() {
      const pw = previewCanvas.width;
      const ph = previewCanvas.height;
      previewCtx.clearRect(0, 0, pw, ph);
      previewCtx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph);
    }

    function updateInfo() {
      if (infoEl) {
        infoEl.textContent = `${crop.sw.toFixed(0)}×${crop.sh.toFixed(0)} px`;
      }
    }

    /** rAF-based throttling — at most one visual update per animation frame. */
    let _rafPending = null;
    let _needsInfoOnly = false;

    function refreshUI(infoOnly) {
      if (_rafPending) return;
      _rafPending = requestAnimationFrame(() => {
        _rafPending = null;
        updateCropBox();
        if (!_needsInfoOnly) drawPreview();
        _needsInfoOnly = false;
        updateInfo();
      });
    }

    function flushUI() {
      if (_rafPending) {
        cancelAnimationFrame(_rafPending);
        _rafPending = null;
      }
      updateCropBox();
      drawPreview();
      updateInfo();
    }

    // -----------------------------------------------------------------------
    // Mouse handlers (attached to the display wrapper)
    // -----------------------------------------------------------------------

    const wrapper = modal.querySelector('.bfw-ce-display-wrapper');

    function getEventPos(e) {
      // Use cached rect during active drag to avoid layout thrashing
      const rect = _dragRect || wrapper.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    /** Cached bounding rect set at mousedown, cleared on mouseup */
    let _dragRect = null;

    /**
     * Determine which handle the pointer is over (in display coordinates).
     * Returns null if not on any handle.
     */
    function hitTestHandle(dx, dy) {
      const d = srcToDisp(crop);
      const radius = cfg.HANDLE_RADIUS;

      // Corners
      if (Math.abs(dx - d.x) <= radius && Math.abs(dy - d.y) <= radius) return 'nw';
      if (Math.abs(dx - (d.x + d.w)) <= radius && Math.abs(dy - d.y) <= radius) return 'ne';
      if (Math.abs(dx - d.x) <= radius && Math.abs(dy - (d.y + d.h)) <= radius) return 'sw';
      if (Math.abs(dx - (d.x + d.w)) <= radius && Math.abs(dy - (d.y + d.h)) <= radius) return 'se';

      // Edge midpoints
      if (Math.abs(dx - (d.x + d.w / 2)) <= radius && Math.abs(dy - d.y) <= radius) return 'n';
      if (Math.abs(dx - (d.x + d.w / 2)) <= radius && Math.abs(dy - (d.y + d.h)) <= radius) return 's';
      if (Math.abs(dx - d.x) <= radius && Math.abs(dy - (d.y + d.h / 2)) <= radius) return 'w';
      if (Math.abs(dx - (d.x + d.w)) <= radius && Math.abs(dy - (d.y + d.h / 2)) <= radius) return 'e';

      return null;
    }

    wrapper.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left button
      const pos = getEventPos(e);
      const d = srcToDisp(crop);

      // Check if click is inside crop box
      const inBox = pos.x >= d.x && pos.x <= d.x + d.w
                 && pos.y >= d.y && pos.y <= d.y + d.h;

      if (!inBox) return;

      // Check handles first
      const handle = hitTestHandle(pos.x, pos.y);
      dragMode = handle || 'move';
      dragStart = {
        x: pos.x,
        y: pos.y,
        crop: { ...crop },
      };

      e.preventDefault();
      e.stopPropagation();

      // Cache bounding rect for the duration of this drag
      _dragRect = wrapper.getBoundingClientRect();

      // Bind document-level listeners so drag continues outside the wrapper
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
    });

    function onDragMove(e) {
      if (!dragMode) return;
      const pos = getEventPos(e);
      const dx = (pos.x - dragStart.x) / scale;
      const dy = (pos.y - dragStart.y) / scale;
      const orig = dragStart.crop;
      const ratio = cfg.TARGET_RATIO;

      let newCrop;

      switch (dragMode) {
        case 'move': {
          newCrop = {
            sx: orig.sx + dx,
            sy: orig.sy + dy,
            sw: orig.sw,
            sh: orig.sh,
          };
          break;
        }
        // Corners — anchor opposite corner, adjust width then derive height from ratio
        case 'nw': {
          const newSW = orig.sw - dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx + orig.sw - newSW,
            sy: orig.sy + orig.sh - newSH,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 'se': {
          const newSW = orig.sw + dx;
          newCrop = {
            sx: orig.sx,
            sy: orig.sy,
            sw: newSW,
            sh: newSW / ratio,
          };
          break;
        }
        case 'ne': {
          const newSW = orig.sw + dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx,
            sy: orig.sy + orig.sh - newSH,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 'sw': {
          const newSW = orig.sw - dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx + orig.sw - newSW,
            sy: orig.sy,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        // Edges — adjust one dimension, derive the other from ratio
        case 'n': {
          const newSH = orig.sh - dy;
          const newSW = newSH * ratio;
          newCrop = {
            sx: orig.sx + (orig.sw - newSW) / 2,
            sy: orig.sy + orig.sh - newSH,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 's': {
          const newSH = orig.sh + dy;
          const newSW = newSH * ratio;
          newCrop = {
            sx: orig.sx + (orig.sw - newSW) / 2,
            sy: orig.sy,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 'w': {
          const newSW = orig.sw - dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx + orig.sw - newSW,
            sy: orig.sy + (orig.sh - newSH) / 2,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 'e': {
          const newSW = orig.sw + dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx,
            sy: orig.sy + (orig.sh - newSH) / 2,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        default:
          return;
      }

      crop = clampCrop(newCrop);
      refreshUI();
    }

    function onDragEnd() {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      _dragRect = null;
      dragMode = null;
      dragStart = null;
      wrapper.style.cursor = 'default';
    }

    // Hover cursor feedback (non-drag)
    wrapper.addEventListener('mousemove', (e) => {
      if (dragMode) return; // onDragMove handles active drag
      const pos = getEventPos(e);
      const d = srcToDisp(crop);
      const inBox = pos.x >= d.x && pos.x <= d.x + d.w
                 && pos.y >= d.y && pos.y <= d.y + d.h;
      if (!inBox) {
        wrapper.style.cursor = 'default';
        return;
      }
      const handle = hitTestHandle(pos.x, pos.y);
      const cursors = {
        nw: 'nwse-resize', se: 'nwse-resize',
        ne: 'nesw-resize', sw: 'nesw-resize',
        n: 'ns-resize', s: 'ns-resize',
        w: 'ew-resize', e: 'ew-resize',
      };
      wrapper.style.cursor = cursors[handle] || 'move';
    });

    // -----------------------------------------------------------------------
    // Buttons
    // -----------------------------------------------------------------------

    // Reset to auto-detect
    const resetBtn = modal.querySelector('.bfw-ce-btn-reset');
    resetBtn.addEventListener('click', async () => {
      resetBtn.disabled = true;
      resetBtn.textContent = '检测中…';
      try {
        const originalImg = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('failed'));
          el.src = origDataUrl;
        });
        const { cropRect } = await smartCropToStandard(originalImg);
        crop = clampCrop(cropRect);
        flushUI();
      } catch (e) {
        // Keep current crop on failure
      } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = '重新检测';
      }
    });

    // Save
    const saveBtn = modal.querySelector('.bfw-ce-btn-save');
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = '保存中…';
      try {
        const ok = await updateCrop(entryId, crop);
        if (ok && onSaved) onSaved();
      } finally {
        closeCropEditor();
      }
    });

    // Cancel
    const cancelBtn = modal.querySelector('.bfw-ce-btn-cancel');
    cancelBtn.addEventListener('click', () => closeCropEditor());

    // Close via backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCropEditor();
    });

    // Close via Escape
    const onKey = (e) => {
      if (e.key === 'Escape') closeCropEditor();
    };
    document.addEventListener('keydown', onKey);
    modal._onKey = onKey;

    // Initial render
    flushUI();
  }

  /**
   * Close the active crop editor modal, if any.
   */
  function closeCropEditor() {
    if (!activeModal) return;

    if (activeModal._onKey) {
      document.removeEventListener('keydown', activeModal._onKey);
    }
    activeModal.remove();
    activeModal = null;
  }

  // ---------------------------------------------------------------------------
  // DOM factory
  // ---------------------------------------------------------------------------

  /**
   * Build the crop editor modal DOM.
   *
   * @param {number} dispW  — image display width
   * @param {number} dispH  — image display height
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   * @returns {HTMLElement}
   */
  function createModalDOM(dispW, dispH, entry) {
    const modal = document.createElement('div');
    modal.className = 'bfw-ce-overlay';

    const hs = CROP_EDITOR_CONFIG.HANDLE_SIZE;
    const previewW = CROP_EDITOR_CONFIG.PREVIEW_SIZE;
    const previewH = Math.round(previewW / CROP_EDITOR_CONFIG.TARGET_RATIO);

    modal.innerHTML = `
    <div class="bfw-ce-modal" style="--ce-disp-w: ${dispW}px; --ce-disp-h: ${dispH}px;">
      <div class="bfw-ce-header">
        <span class="bfw-ce-title">裁剪编辑 — ${escapeHtml$2(entry.name)}</span>
        <button class="bfw-ce-close" title="关闭">${icons.x}</button>
      </div>
      <div class="bfw-ce-body">
        <div class="bfw-ce-main">
          <div class="bfw-ce-display-wrapper" style="width:${dispW}px;height:${dispH}px;">
            <img class="bfw-ce-display-img" draggable="false" />
            <div class="bfw-ce-crop-mask"></div>
            <div class="bfw-ce-crop-box">
              <div class="bfw-ce-handle bfw-ce-h-nw" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-ne" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-sw" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-se" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-n"  style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-s"  style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-w"  style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-e"  style="width:${hs}px;height:${hs}px;"></div>
            </div>
          </div>
          <div class="bfw-ce-info"></div>
        </div>
        <div class="bfw-ce-sidebar">
          <div class="bfw-ce-preview-label">裁剪预览</div>
          <div class="bfw-ce-preview-box">
            <canvas class="bfw-ce-preview-canvas" width="${previewW}" height="${previewH}"></canvas>
          </div>
          <div class="bfw-ce-preview-size">400 × 300</div>
        </div>
      </div>
      <div class="bfw-ce-footer">
        <button class="bfw-ce-btn bfw-ce-btn-reset">重新检测</button>
        <div class="bfw-ce-footer-right">
          <button class="bfw-ce-btn bfw-ce-btn-cancel">取消</button>
          <button class="bfw-ce-btn bfw-ce-btn-save bfw-ce-btn-primary">保存</button>
        </div>
      </div>
    </div>
  `;

    return modal;
  }

  /** Escape HTML special characters. */
  function escapeHtml$2(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * @file Progress statistics panel — displays learning session history and aggregate stats.
   *
   * Creates a collapsible stats section in the main panel with:
   *   - Today's summary (sessions, minutes, lessons)
   *   - This week's summary (sessions, minutes, lessons, active days)
   *   - All-time summary (total sessions, study time, lessons, courses)
   *   - Recent sessions log (last 10)
   *   - Course breakdown list (sortable by last study date)
   *   - Clear history action
   */


  // ---------------------------------------------------------------------------
  // Chart rendering cache
  // ---------------------------------------------------------------------------

  /** Last rendered chart data key (used to skip redundant redraws) */
  let _lastChartDataKey = null;

  /**
   * Create the stats section DOM.
   * @returns {HTMLElement}
   */
  function createStatsSection() {
    const section = document.createElement('div');
    section.className = 'bfw-stats-section';
    section.innerHTML = `
    <div class="bfw-stats-header">
      <span class="bfw-stats-title">${icons.barChart} 学习统计</span>
      <button class="bfw-stats-toggle" title="切换统计面板">${icons.chevronDown}</button>
    </div>
    <div class="bfw-stats-content" style="display: none;">
      <!-- Today's stats -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">今天</div>
        <div class="bfw-stats-grid">
          <div class="bfw-stat-card">
            <div class="stat-label">学习次数</div>
            <div class="stat-value" id="stat-today-sessions">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">学习时长</div>
            <div class="stat-value" id="stat-today-duration">0分钟</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程完成</div>
            <div class="stat-value" id="stat-today-lessons">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程数</div>
            <div class="stat-value" id="stat-today-courses">0</div>
          </div>
        </div>
      </div>

      <!-- This week's stats -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">本周</div>
        <div class="bfw-stats-grid">
          <div class="bfw-stat-card">
            <div class="stat-label">学习次数</div>
            <div class="stat-value" id="stat-week-sessions">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">学习时长</div>
            <div class="stat-value" id="stat-week-duration">0小时</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程完成</div>
            <div class="stat-value" id="stat-week-lessons">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">活跃天数</div>
            <div class="stat-value" id="stat-week-days">0</div>
          </div>
        </div>
      </div>

      <!-- Weekly trend chart -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">学习趋势</div>
        <div class="bfw-trend-legend">
          <span class="bfw-legend-item"><span class="bfw-legend-dot bfw-legend-dot-blue"></span>学习时长</span>
          <span class="bfw-legend-item"><span class="bfw-legend-dot bfw-legend-dot-green"></span>学习课程</span>
        </div>
        <div class="bfw-trend-chart" id="bfw-trend-chart">
          <canvas id="bfw-trend-canvas"></canvas>
        </div>
      </div>

      <!-- All-time stats -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">累计</div>
        <div class="bfw-stats-grid">
          <div class="bfw-stat-card">
            <div class="stat-label">总学习次数</div>
            <div class="stat-value" id="stat-total-sessions">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">总学习时长</div>
            <div class="stat-value" id="stat-total-duration">0小时</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">总课程完成</div>
            <div class="stat-value" id="stat-total-lessons">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程数</div>
            <div class="stat-value" id="stat-total-courses">0</div>
          </div>
        </div>
      </div>

      <!-- Recent sessions -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">最近学习</div>
        <div class="bfw-recent-sessions" id="bfw-recent-sessions">
          <div class="bfw-sessions-empty">暂无学习记录</div>
        </div>
      </div>

      <!-- Courses breakdown -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">课程详情</div>
        <div class="bfw-courses-list" id="bfw-courses-list">
          <div class="bfw-courses-empty">暂无课程</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="bfw-stats-actions">
        <button class="bfw-btn bfw-btn-danger" id="bfw-btn-clear-stats">清空统计</button>
      </div>
    </div>
  `;

    return section;
  }

  /**
   * Refresh all stats displays.
   * Called on panel mount or when stats data changes.
   *
   * @param {HTMLElement} panel - The main panel element
   */
  function refreshStats(panel) {
    if (!panel) return;

    const statsSection = panel.querySelector('.bfw-stats-section');
    if (!statsSection) return;

    // Today's stats
    const today = getTodayStats();
    panel.querySelector('#stat-today-sessions').textContent = today.sessionsCount;
    panel.querySelector('#stat-today-duration').textContent = `${today.totalDuration}分钟`;
    panel.querySelector('#stat-today-lessons').textContent = today.lessonsCompleted;
    panel.querySelector('#stat-today-courses').textContent = today.coursesStudied.size;

    // This week's stats
    const week = getWeekStats();
    panel.querySelector('#stat-week-sessions').textContent = week.sessionsCount;
    panel.querySelector('#stat-week-duration').textContent = week.totalDuration >= 60
      ? `${Math.round(week.totalDuration / 60)}小时`
      : `${week.totalDuration}分钟`;
    panel.querySelector('#stat-week-lessons').textContent = week.lessonsCompleted;
    panel.querySelector('#stat-week-days').textContent = week.daysActive;

    // Weekly trend chart
    refreshTrendChart(panel);

    // All-time stats
    const allTime = getAllTimeStats();
    panel.querySelector('#stat-total-sessions').textContent = allTime.sessionsCount;
    panel.querySelector('#stat-total-duration').textContent = allTime.totalDuration >= 60
      ? `${Math.round(allTime.totalDuration / 60)}小时`
      : `${allTime.totalDuration}分钟`;
    panel.querySelector('#stat-total-lessons').textContent = allTime.lessonsCompleted;
    panel.querySelector('#stat-total-courses').textContent = allTime.coursesCount;

    // Recent sessions
    const recentEl = panel.querySelector('#bfw-recent-sessions');
    const recentSessions = getRecentSessions(10);
    if (recentSessions.length === 0) {
      recentEl.innerHTML = '<div class="bfw-sessions-empty">暂无学习记录</div>';
    } else {
      recentEl.innerHTML = recentSessions.map(session => `
      <div class="bfw-session-item">
        <div class="session-name">${escapeHtml$1(session.courseName)}</div>
        <div class="session-meta">
          <span class="session-time">${session.startDate}</span>
          <span class="session-duration">${session.durationMin}分钟</span>
          <span class="session-lessons">完成 ${session.lessonsCompleted} 课</span>
        </div>
      </div>
    `).join('');
    }

    // Courses breakdown
    const coursesEl = panel.querySelector('#bfw-courses-list');
    const courses = getCoursesList();
    if (courses.length === 0) {
      coursesEl.innerHTML = '<div class="bfw-courses-empty">暂无课程</div>';
    } else {
      coursesEl.innerHTML = courses.map(course => {
        const sessionCount = course.sessions ? course.sessions.length : 0;
        const totalMinutes = course.totalStudyTime || 0;
        const totalHours = totalMinutes >= 60 ? Math.round(totalMinutes / 60) : 0;
        const displayTime = totalHours > 0 ? `${totalHours}h` : `${totalMinutes}min`;

        return `
        <div class="bfw-course-item">
          <div class="course-header">
            <span class="course-name">${escapeHtml$1(course.name)}</span>
            <span class="course-rate">${course.completionRate}%</span>
          </div>
          <div class="course-progress">
            <div class="course-bar">
              <div class="course-bar-fill" style="width: ${course.completionRate}%"></div>
            </div>
          </div>
          <div class="course-stats">
            <span class="course-stat">完成 ${course.completedCount}/${course.totalLessons}</span>
            <span class="course-stat">${sessionCount} 次</span>
            <span class="course-stat">${displayTime}</span>
          </div>
        </div>
      `;
      }).join('');
    }
  }

  /**
   * Draw the weekly trend chart on canvas.
   * Dual-line chart: study duration (blue, left axis) and lessons completed (green, right axis).
   *
   * @param {HTMLElement} panel
   */
  function refreshTrendChart(panel) {
    const canvas = panel.querySelector('#bfw-trend-canvas');
    if (!canvas) return;

    const data = getDailyTrendData(7);

    // Skip redraw if data hasn't changed (optimization for frequent refreshStats calls)
    const dataKey = JSON.stringify(data.map(d => [d.duration, d.lessons]));
    if (_lastChartDataKey === dataKey) return;
    _lastChartDataKey = dataKey;

    const ctx = canvas.getContext('2d');

    // Set canvas size (2x for retina)
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;

    // Parent is hidden (display:none) — skip and don't cache, so the next call
    // after the panel is expanded draws correctly.
    if (cssWidth === 0) return;

    canvas.width = cssWidth * dpr;
    canvas.height = 140 * dpr;
    ctx.scale(dpr, dpr);

    const width = cssWidth;
    const height = 140;
    const padding = { top: 18, right: 14, bottom: 30, left: 14 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const baselineY = height - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    // Find max values for scaling (handle all-zero gracefully)
    const maxDuration = Math.max(...data.map(d => d.duration), 1);
    const maxLessons = Math.max(...data.map(d => d.lessons), 1);

    // Calculate point positions for both series
    const durationPoints = data.map((d, i) => ({
      x: padding.left + (chartWidth / (data.length - 1)) * i,
      y: padding.top + chartHeight - (d.duration / maxDuration) * chartHeight,
      value: d.duration,
      label: d.label,
    }));

    const lessonsPoints = data.map((d, i) => ({
      x: padding.left + (chartWidth / (data.length - 1)) * i,
      y: padding.top + chartHeight - (d.lessons / maxLessons) * chartHeight,
      value: d.lessons,
      label: d.label,
    }));

    // Monotone cubic interpolation (Fritsch-Carlson): smooth curves that never overshoot.
    // Computes tangents that preserve local monotonicity, then converts to bezier segments.
    function monotoneCubicPath(pts) {
      const n = pts.length;
      if (n < 2) return [];
      // Secant slopes between adjacent points
      const d = [];
      for (let i = 0; i < n - 1; i++) {
        const dx = pts[i + 1].x - pts[i].x;
        d.push(dx === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx);
      }
      // Initial tangent at each point: average of neighboring secants
      const m = new Array(n);
      m[0] = d[0];
      m[n - 1] = d[n - 2];
      for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] + d[i]) / 2;
      // Fritsch-Carlson monotonicity constraint
      for (let i = 0; i < n - 1; i++) {
        if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
        const a = m[i] / d[i], b = m[i + 1] / d[i];
        const mag = a * a + b * b;
        if (mag > 9) { const t = 3 / Math.sqrt(mag); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
      }
      // Return bezier segments
      const segs = [];
      for (let i = 0; i < n - 1; i++) {
        const h = pts[i + 1].x - pts[i].x;
        segs.push([
          pts[i].x + h / 3,        pts[i].y + m[i] * h / 3,
          pts[i + 1].x - h / 3,    pts[i + 1].y - m[i + 1] * h / 3,
          pts[i + 1].x,             pts[i + 1].y,
        ]);
      }
      return segs;
    }

    // Helper: draw a smooth area-fill + stroke line for a series
    function drawLineSeries(points, strokeColor, fillGradient) {
      const segs = monotoneCubicPath(points);

      // Fill area under curve
      ctx.beginPath();
      ctx.moveTo(points[0].x, baselineY);
      ctx.lineTo(points[0].x, points[0].y);
      segs.forEach(s => ctx.bezierCurveTo(...s));
      ctx.lineTo(points[points.length - 1].x, baselineY);
      ctx.closePath();
      ctx.fillStyle = fillGradient;
      ctx.fill();

      // Stroke the curve
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      segs.forEach(s => ctx.bezierCurveTo(...s));
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Duration gradient (blue → teal)
    const durationGradient = ctx.createLinearGradient(0, padding.top, 0, baselineY);
    durationGradient.addColorStop(0, 'rgba(137, 180, 250, 0.25)');
    durationGradient.addColorStop(0.5, 'rgba(116, 199, 236, 0.15)');
    durationGradient.addColorStop(1, 'rgba(148, 226, 213, 0.05)');

    // Lessons gradient (green)
    const lessonsGradient = ctx.createLinearGradient(0, padding.top, 0, baselineY);
    lessonsGradient.addColorStop(0, 'rgba(166, 227, 161, 0.22)');
    lessonsGradient.addColorStop(0.5, 'rgba(148, 226, 190, 0.12)');
    lessonsGradient.addColorStop(1, 'rgba(148, 226, 213, 0.03)');

    // Draw lessons area first (behind duration), then duration on top
    drawLineSeries(lessonsPoints, '#a6e3a1', lessonsGradient);
    drawLineSeries(durationPoints, '#89b4fa', durationGradient);

    // Draw dots only (no labels)
    function drawDots(points, color) {
      points.forEach((p) => {
        const active = p.value > 0;
        if (active) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = color.replace(')', ', 0.15)').replace('rgb', 'rgba');
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1e1e2e';
        ctx.fill();
        ctx.strokeStyle = active ? color : '#45475a';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Draw labels for both series together per column, resolving vertical collisions.
    // The series whose dot is higher (smaller Y) gets its label above; the other below.
    // If both labels would still be within MIN_GAP pixels of each other, push them apart.
    function drawDualLabels(dPts, lPts, dFmt, lFmt) {
      const MIN_GAP = 16; // px between two labels
      const ABOVE_OFFSET = -10;
      const BELOW_OFFSET = 18;

      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';

      dPts.forEach((dp, i) => {
        const lp = lPts[i];
        const dActive = dp.value > 0;
        const lActive = lp.value > 0;

        if (!dActive && !lActive) return;

        if (dActive && !lActive) {
          // Only duration label — always above its dot
          const y = Math.max(14, Math.min(dp.y + ABOVE_OFFSET, baselineY - 2));
          ctx.fillStyle = '#89b4fa';
          ctx.fillText(dFmt(dp.value), dp.x, y);
          return;
        }

        if (!dActive && lActive) {
          // Only lessons label — always below its dot
          const y = Math.max(14, Math.min(lp.y + BELOW_OFFSET, baselineY - 2));
          ctx.fillStyle = '#a6e3a1';
          ctx.fillText(lFmt(lp.value), lp.x, y);
          return;
        }

        // Both active: the higher dot (smaller Y) gets label above, lower dot gets label below
        let dyAbove, dyBelow, colorAbove, colorBelow, textAbove, textBelow, xAbove, xBelow;
        if (dp.y <= lp.y) {
          // duration is higher
          dyAbove = dp.y + ABOVE_OFFSET;
          dyBelow = lp.y + BELOW_OFFSET;
          colorAbove = '#89b4fa'; textAbove = dFmt(dp.value); xAbove = dp.x;
          colorBelow = '#a6e3a1'; textBelow = lFmt(lp.value); xBelow = lp.x;
        } else {
          // lessons is higher
          dyAbove = lp.y + ABOVE_OFFSET;
          dyBelow = dp.y + BELOW_OFFSET;
          colorAbove = '#a6e3a1'; textAbove = lFmt(lp.value); xAbove = lp.x;
          colorBelow = '#89b4fa'; textBelow = dFmt(dp.value); xBelow = dp.x;
        }

        // Clamp to chart bounds first
        dyAbove = Math.max(14, dyAbove);
        dyBelow = Math.min(dyBelow, baselineY - 2);

        // If the two labels are still too close, push them apart symmetrically
        const gap = dyBelow - dyAbove;
        if (gap < MIN_GAP) {
          const nudge = (MIN_GAP - gap) / 2;
          dyAbove = Math.max(14, dyAbove - nudge);
          dyBelow = Math.min(dyBelow + nudge, baselineY - 2);
        }

        ctx.fillStyle = colorAbove;
        ctx.fillText(textAbove, xAbove, dyAbove);
        ctx.fillStyle = colorBelow;
        ctx.fillText(textBelow, xBelow, dyBelow);
      });
    }

    drawDots(durationPoints, '#89b4fa');
    drawDots(lessonsPoints, '#a6e3a1');
    drawDualLabels(durationPoints, lessonsPoints, v => v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`, v => `${v}节`);

    // Day labels (bottom axis) — draw once shared
    durationPoints.forEach((p) => {
      ctx.fillStyle = '#a6adc8';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, baselineY + 18);
    });
  }

  /**
   * Escape HTML entities to prevent XSS.
   * @param {string} str
   * @returns {string}
   */
  const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml$1(str) {
    return String(str).replace(/[&<>"']/g, m => escapeMap[m]);
  }

  /**
   * Bind stats section event listeners (toggle, actions).
   *
   * @param {HTMLElement} panel
   * @param {Function} onClearStats - Callback when clear button is clicked
   */
  function bindStatsEvents(panel, onClearStats) {
    const toggle = panel.querySelector('.bfw-stats-toggle');
    const content = panel.querySelector('.bfw-stats-content');
    const clearBtn = panel.querySelector('#bfw-btn-clear-stats');

    const header = panel.querySelector('.bfw-stats-header');
    if (header && toggle && content) {
      header.addEventListener('click', () => {
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        toggle.style.transform = isVisible ? '' : 'rotate(180deg)';

        // Force chart redraw on expand — canvas had zero width while hidden
        if (!isVisible) {
          _lastChartDataKey = null;
          refreshStats(panel);
        }
      });

      // Set initial state — content starts hidden, so chevron should not be rotated
      toggle.style.transform = '';
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (confirm('确定要清空所有学习统计数据吗？此操作无法撤销。')) {
          if (onClearStats) await onClearStats();
          refreshStats(panel);
        }
      });
    }
  }

  /**
   * @file Page version compatibility checker
   *
   * Detects the page version from DOM and compares against a white/black list
   * to determine compatibility status.  Conservative strategy: only mark as
   * "tested" when explicitly verified; everything else is "unknown".
   */


  /**
   * Compatibility map — tested versions only.
   * Only add versions after manual testing confirms full functionality.
   *
   * Format:
   *   'x.y.z': 'tested'     - Fully compatible, tested personally
   *   'x.y.z': 'incompatible' - Known to break (future use)
   */
  const COMPATIBILITY_MAP = {
    '1.0.20': 'tested',
    // Add more as you test new versions
  };

  /**
   * Status descriptions for each compatibility level.
   * Icons are SVG strings imported from icons.js.
   */
  const STATUS_INFO = {
    tested: {
      iconKey: 'versionTested',
      color: '#52c41a',
      message: '完全兼容',
    },
    unknown: {
      iconKey: 'versionUnknown',
      color: '#faad14',
      message: '未在此版本测试',
    },
    incompatible: {
      iconKey: 'versionIncompatible',
      color: '#ff4d4f',
      message: '已知不兼容',
    },
    missing: {
      iconKey: 'versionMissing',
      color: '#8c8c8c',
      message: '未检测到版本号',
    },
  };

  /**
   * Check the page version and determine compatibility status.
   *
   * @returns {Object} Compatibility result
   * @property {string} status - 'tested' | 'unknown' | 'incompatible' | 'missing'
   * @property {string} [pageVersion] - Detected page version (if found)
   * @property {string} scriptVersion - Current script version
   * @property {string} iconKey - Icon key name for icons.js lookup
   * @property {string} color - Status color (CSS)
   * @property {string} message - Human-readable status description
   */
  function checkPageVersion() {
    // Try multiple selectors — CSS Modules hash may change
    const selectors = [
      '.versions___2-l4L',                    // Current CSS Module hash
      '[class*="versions"]',                  // Partial match fallback
      '.ant-layout-footer [class*="version"]', // Common Ant Design footer pattern
    ];

    let versionEl = null;
    for (const selector of selectors) {
      versionEl = document.querySelector(selector);
      if (versionEl) break;
    }

    // Case 1: Version element not found
    if (!versionEl) {
      const info_status = STATUS_INFO.missing;
      warn('未检测到页面版本号元素');
      return {
        status: 'missing',
        scriptVersion: SCRIPT_VERSION,
        ...info_status,
      };
    }

    // Case 2: Parse version number
    const match = versionEl.textContent.match(/版本号[：:]\s*([\d.]+)/);
    if (!match) {
      const info_status = STATUS_INFO.missing;
      warn('版本号格式异常:', versionEl.textContent);
      return {
        status: 'missing',
        scriptVersion: SCRIPT_VERSION,
        ...info_status,
      };
    }

    const pageVersion = match[1];
    const knownStatus = COMPATIBILITY_MAP[pageVersion];

    // Case 3: Known tested version
    if (knownStatus === 'tested') {
      const info_status = STATUS_INFO.tested;
      info(`页面版本: ${pageVersion}, 脚本版本: ${SCRIPT_VERSION}, 兼容性: 已测试`);
      return {
        status: 'tested',
        pageVersion,
        scriptVersion: SCRIPT_VERSION,
        ...info_status,
      };
    }

    // Case 4: Known incompatible version
    if (knownStatus === 'incompatible') {
      const info_status = STATUS_INFO.incompatible;
      error(`页面版本 ${pageVersion} 与脚本不兼容`);
      return {
        status: 'incompatible',
        pageVersion,
        scriptVersion: SCRIPT_VERSION,
        ...info_status,
      };
    }

    // Case 5: Unknown version (default — conservative strategy)
    const info_status = STATUS_INFO.unknown;
    warn(`页面版本: ${pageVersion}, 脚本版本: ${SCRIPT_VERSION}, 兼容性: 未知 (未测试)`);
    return {
      status: 'unknown',
      pageVersion,
      scriptVersion: SCRIPT_VERSION,
      ...info_status,
    };
  }

  /**
   * @file Update checker — queries the update API and caches results.
   *
   * Strategy:
   *   - Checks once per session after a 5-second startup delay.
   *   - Result is cached in localStorage for 24 hours; no request is made
   *     if a fresh cached result exists.
   *   - Network/parse errors are silently swallowed — never interrupts the
   *     main script flow.
   *   - Exposes public APIs: checkForUpdate, invalidateUpdateCache,
   *     ignoreVersion, clearIgnoredVersion.
   */


  /**
   * Compare two semver strings (e.g. "1.2.3").
   * Returns negative if a < b, zero if equal, positive if a > b.
   * Missing or non-numeric segments are treated as 0.
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  function compareSemver(a, b) {
    const pa = (a).split('.').map(Number);
    const pb = (b ?? '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const na = Number.isFinite(pa[i]) ? pa[i] : 0;
      const nb = Number.isFinite(pb[i]) ? pb[i] : 0;
      if (na !== nb) return na - nb;
    }
    return 0;
  }

  const CACHE_KEY = 'bfw_update_cache';
  const IGNORE_KEY = 'bfw_ignored_version';
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const CHECK_DELAY_MS = 5000;
  const FETCH_TIMEOUT_MS = 8000;

  /**
   * @typedef {Object} UpdateResult
   * @property {boolean} hasUpdate
   * @property {string}  latestVersion
   * @property {string}  downloadUrl
   * @property {Array<{type: string, title: string, description?: string}>} changelog
   * @property {string}  releaseUrl
   * @property {string}  checkedAt  — ISO timestamp
   * @property {string}  [ignoredVersion] — set when the user has dismissed this version
   */

  /**
   * Read and validate the cached update result.
   * Returns null if absent or stale.
   * @returns {Promise<UpdateResult|null>}
   */
  async function readCache() {
    try {
      const raw = await getStorageAdapter().get(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.checkedAt) return null;
      if (Date.now() - new Date(parsed.checkedAt).getTime() > CACHE_TTL_MS) return null;
      // If the user has already updated to or past the version that was
      // flagged as new, discard the stale cache entry.
      if (parsed.hasUpdate && parsed.latestVersion && compareSemver(SCRIPT_VERSION, parsed.latestVersion) >= 0) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Persist an update result via the storage adapter.
   * Fails silently if storage is unavailable.
   * @param {UpdateResult} result
   */
  async function writeCache(result) {
    try {
      await getStorageAdapter().set(CACHE_KEY, JSON.stringify(result));
    } catch { /* quota exceeded or unavailable — non-fatal */ }
  }

  /**
   * Invalidate the cached result, forcing a fresh check on next call.
   */
  function invalidateUpdateCache() {
    getStorageAdapter().remove(CACHE_KEY).catch(() => { /* non-fatal */ });
  }

  /**
   * Get the currently ignored version string, or null if none.
   * @returns {Promise<string|null>}
   */
  async function getIgnoredVersion() {
    try {
      return await getStorageAdapter().get(IGNORE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Persist a version string as ignored (user dismissed this version).
   * @param {string} version
   */
  async function ignoreVersion(version) {
    try {
      await getStorageAdapter().set(IGNORE_KEY, version);
    } catch { /* non-fatal */ }
  }

  /**
   * Clear the ignored version record.  Exported so the UI can reset
   * the ignore state when the user manually rechecks or a new version appears.
   */
  function clearIgnoredVersion() {
    getStorageAdapter().remove(IGNORE_KEY).catch(() => { /* non-fatal */ });
  }

  /**
   * Fetch update info from the API with a timeout.
   * @returns {Promise<UpdateResult>}
   */
  async function fetchUpdateInfo() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      // Step 1 — check endpoint returns hasUpdate + version + downloadUrl
      const checkUrl = `${UPDATE_API_URL}/api/v1/check?version=${encodeURIComponent(SCRIPT_VERSION)}`;
      const checkRes = await fetch(checkUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!checkRes.ok) throw new Error(`HTTP ${checkRes.status}`);
      const check = await checkRes.json();

      if (!check.hasUpdate) {
        return {
          hasUpdate: false,
          latestVersion: check.version ?? SCRIPT_VERSION,
          downloadUrl: check.downloadUrl ?? '',
          changelog: [],
          releaseUrl: '',
          checkedAt: new Date().toISOString(),
        };
      }

      // Step 2 — fetch full release metadata for changelog (only when update exists)
      let changelog = [];
      let releaseUrl = '';
      try {
        const releaseUrl_ = `${UPDATE_API_URL}/api/v1/releases/${encodeURIComponent(check.version)}`;
        const releaseRes = await fetch(releaseUrl_, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (releaseRes.ok) {
          const release = await releaseRes.json();
          changelog = Array.isArray(release.changelog) ? release.changelog : [];
          releaseUrl = release.source?.releaseUrl ?? '';
        }
      } catch { /* changelog fetch failure is non-fatal — still show update badge */ }

      return {
        hasUpdate: true,
        latestVersion: check.version,
        downloadUrl: check.downloadUrl,
        changelog,
        releaseUrl,
        checkedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Apply the ignore filter: if the result has an update but the user has
   * dismissed that exact version, treat it as no update with ignoredVersion set.
   * This is applied on both cached and freshly-fetched results.
   * @param {UpdateResult} result
   * @returns {Promise<UpdateResult>}
   */
  async function applyIgnoreFilter(result) {
    if (!result.hasUpdate) return result;
    const ignored = await getIgnoredVersion();
    if (ignored && ignored === result.latestVersion) {
      return {
        ...result,
        hasUpdate: false,
        ignoredVersion: result.latestVersion,
      };
    }
    return result;
  }

  /**
   * Check for updates and invoke the callback when a result is available.
   * Uses the 24-hour cache; forces a fresh fetch only when cache is stale.
   *
   * @param {(result: UpdateResult) => void} onResult
   * @param {Object}   [opts]
   * @param {boolean}  [opts.force=false]  — bypass cache
   * @param {number}   [opts.delay=CHECK_DELAY_MS]  — startup delay in ms
   * @param {Function} [opts.onError]  — called when the check fails (network/timeout)
   */
  function checkForUpdate(onResult, { force = false, delay = CHECK_DELAY_MS, onError } = {}) {
    // Serve from cache immediately (localStorage is synchronous, no need to wait).
    if (!force) {
      readCache().then(async (cached) => {
        if (cached) {
          const filtered = await applyIgnoreFilter(cached);
          debug('[update] serving from cache:', filtered.latestVersion, 'hasUpdate:', filtered.hasUpdate);
          onResult(filtered);
        }
      });
    }

    // Deferred network fetch — only when cache misses or force=true.
    setTimeout(async () => {
      if (!force) {
        const cached = await readCache();
        if (cached) return; // already served immediately above
      }

      try {
        const result = await fetchUpdateInfo();
        await writeCache(result);
        const filtered = await applyIgnoreFilter(result);
        debug('[update] fetched:', filtered.latestVersion, 'hasUpdate:', filtered.hasUpdate);
        onResult(filtered);
      } catch (err) {
        debug('[update] check failed:', err?.message);
        onError?.();
      }
    }, delay);
  }

  /**
   * @file Import/Export — ZIP-based backup and restore for all userscript data.
   *
   * Data categories:
   *   1. Settings       — 6 boolean toggles (~200 bytes JSON)
   *   2. Learning progress — sessions + courses history (~50 KB JSON)
   *   3. Image pool     — cropped/original JPEGs + meta + stats (up to ~7 MB)
   *
   * ZIP layout:
   *   manifest.json          — formatVersion, exportedAt, scriptVersion, section summaries
   *   settings.json          — { faceAutoClick, videoReplace, ... }
   *   progress.json          — { version, sessions[], courses{}, lastSync }
   *   pool-meta.json         — { version, nextId, entries[] }
   *   pool-stats.json        — { [id]: ImageStats }
   *   images/
   *     {id}_cropped.jpg     — raw JPEG binary (STORE, no re-compression)
   *     {id}_original.jpg    — raw JPEG binary (optional)
   *
   * All ZIP entries use STORE (no compression) — JPEG is already compressed.
   */


  // ---------------------------------------------------------------------------
  // Constants (re-exported from config for convenience)
  // ---------------------------------------------------------------------------

  /** Current backup format version. */
  const FORMAT_VERSION = IMPORT_EXPORT_CONFIG.FORMAT_VERSION;

  /** Estimated average cropped JPEG size for file-size prediction (bytes). */
  const EST_CROPPED_JPEG_SIZE = IMPORT_EXPORT_CONFIG.EST_CROPPED_JPEG_SIZE;
  /** Estimated average original JPEG size for file-size prediction (bytes). */
  const EST_ORIG_JPEG_SIZE = IMPORT_EXPORT_CONFIG.EST_ORIG_JPEG_SIZE;
  /** Per-image JSON overhead in pool-meta.json + pool-stats.json (bytes). */
  const EST_PER_IMAGE_JSON = IMPORT_EXPORT_CONFIG.EST_PER_IMAGE_JSON;

  // ---------------------------------------------------------------------------
  // Data URI ↔ Blob conversion
  // ---------------------------------------------------------------------------

  /**
   * Convert a base64 data URI to a Blob (raw binary).
   * Preserves the original MIME type.
   * @param {string} dataUri
   * @returns {Blob}
   */
  function dataURIToBlob(dataUri) {
    const commaIdx = dataUri.indexOf(',');
    const header = dataUri.slice(0, commaIdx);
    const mime = (header.match(/:(.*?);/) || ['', 'image/jpeg'])[1];
    const bytes = atob(dataUri.slice(commaIdx + 1));
    const buf = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    return new Blob([buf], { type: mime });
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  /**
   * Compute estimated export size per section for UI preview.
   * @param {{ settings: boolean, progress: boolean, imagePool: boolean }} sections
   * @returns {{ settings: number, progress: number, imagePool: number, total: number }}
   */
  function estimateExportSize(sections) {
    let settings = 0;
    let progress = 0;
    let imagePool = 0;

    if (sections.settings) {
      settings = 300; // ~200 bytes JSON + manifest overhead
    }

    if (sections.progress) {
      const data = getProgressData();
      const sessions = (data.sessions || []).length;
      const courses = Object.keys(data.courses || {}).length;
      progress = 500 + sessions * 200 + courses * 300; // rough estimate
    }

    if (sections.imagePool) {
      const entries = listEntries();
      const count = entries.length;
      imagePool = count * (EST_CROPPED_JPEG_SIZE + EST_ORIG_JPEG_SIZE + EST_PER_IMAGE_JSON) + 1000;
    }

    const total = settings + progress + imagePool;
    return { settings, progress, imagePool, total };
  }

  /**
   * Format a byte count into a human-readable string.
   * @param {number} bytes
   * @returns {string}
   */
  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Build a backup ZIP blob from the selected data categories.
   *
   * @param {{ settings: boolean, progress: boolean, imagePool: boolean }} sections
   * @param {(phase: string, pct: number, detail?: string) => void} [onProgress]
   *        phase: 'settings' | 'progress' | 'imagePool' | 'done'
   * @returns {Promise<Blob>}
   */
  async function buildBackupBlob(sections, onProgress) {
    const zip = new JSZip();
    const selectedCount = (sections.settings ? 1 : 0) + (sections.progress ? 1 : 0) + (sections.imagePool ? 1 : 0);
    if (selectedCount === 0) throw new Error('No sections selected for export');

    /** @type {{ settings?: Object, progress?: Object, imagePool?: Object }} */
    const manifestSections = {};

    // ---- Phase 1: Settings ----
    if (sections.settings) {
      onProgress?.('settings', 0, '正在导出设置...');
      const settings = {
        faceAutoClick: getSetting('faceAutoClick', true),
        videoReplace: getSetting('videoReplace', true),
        autoCompare: getSetting('autoCompare', true),
        autoCourse: getSetting('autoCourse', false),
        disableVisibilityCheck: getSetting('disableVisibilityCheck', false),
        dynamicWeight: getSetting('dynamicWeight', true),
      };
      zip.file('settings.json', JSON.stringify(settings));
      manifestSections.settings = { count: 6 };
      onProgress?.('settings', 100, '设置已导出');
    }

    // ---- Phase 2: Learning progress ----
    if (sections.progress) {
      onProgress?.('progress', 0, '正在导出学习进度...');
      const progress = getProgressData();
      zip.file('progress.json', JSON.stringify(progress));
      manifestSections.progress = {
        sessions: (progress.sessions || []).length,
        courses: Object.keys(progress.courses || {}).length,
      };
      onProgress?.('progress', 100, '学习进度已导出');
    }

    // ---- Phase 3: Image pool ----
    if (sections.imagePool) {
      onProgress?.('imagePool', 0, '正在导出图片池...');

      const entries = listEntries();
      const count = entries.length;
      const imgFolder = zip.folder('images');

      let exportedCount = 0;
      for (const entry of entries) {
        // Cropped image (always present)
        const cropped = await getImageData(entry.id);
        if (cropped) {
          imgFolder.file(`${entry.id}_cropped.jpg`, dataURIToBlob(cropped));
        }

        // Original image (optional — only if crop editing is available)
        const orig = await getOriginalImageData(entry.id);
        if (orig && entry.cropParams) {
          imgFolder.file(`${entry.id}_original.jpg`, dataURIToBlob(orig));
        }

        exportedCount++;
        onProgress?.('imagePool',
          Math.round(exportedCount / count * 100),
          `正在导出图片 (${exportedCount}/${count})...`,
        );
      }

      // Pool metadata (without dataUrl — images are separate files)
      const poolMeta = {
        version: 1,
        nextId: entries.length > 0 ? entries.reduce((max, e) => Math.max(max, e.id), 0) + 1 : 0,
        entries: entries.map(e => ({
          id: e.id,
          name: e.name,
          hash: e.hash,
          size: e.size,
          width: e.width,
          height: e.height,
          addedAt: e.addedAt,
          cropParams: e.cropParams,
          origWidth: e.origWidth,
          origHeight: e.origHeight,
        })),
      };
      zip.file('pool-meta.json', JSON.stringify(poolMeta));

      // Pool stats
      const poolStats = getAllStats();
      zip.file('pool-stats.json', JSON.stringify(poolStats));

      manifestSections.imagePool = {
        count,
        withOriginals: entries.filter(e => e.cropParams).length,
      };
      onProgress?.('imagePool', 100, '图片池已导出');
    }

    // ---- Manifest ----
    const manifest = {
      formatVersion: FORMAT_VERSION,
      exportedAt: Date.now(),
      scriptVersion: SCRIPT_VERSION,
      sections: manifestSections,
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // ---- Generate ZIP blob (STORE = no re-compression) ----
    onProgress?.('done', 0, '正在打包...');
    const blob = await zip.generateAsync(
      { type: 'blob', compression: 'STORE' },
      (meta) => {
        onProgress?.('done', meta.percent, '正在打包...');
      },
    );
    onProgress?.('done', 100, '导出完成');

    return blob;
  }

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  /**
   * Validate a backup manifest object.
   * @param {Object} manifest
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateManifest(manifest) {
    const errors = [];
    if (!manifest || typeof manifest !== 'object') {
      errors.push('manifest.json 缺失或格式无效');
      return { valid: false, errors };
    }
    if (typeof manifest.formatVersion !== 'number') {
      errors.push('缺少 formatVersion 字段');
    } else if (manifest.formatVersion > FORMAT_VERSION) {
      errors.push(`备份格式版本 (v${manifest.formatVersion}) 高于当前支持 (v${FORMAT_VERSION})，请更新脚本`);
    }
    if (manifest.formatVersion < 1) {
      errors.push(`不支持的备份格式版本: ${manifest.formatVersion}`);
    }
    if (!manifest.sections || typeof manifest.sections !== 'object') {
      errors.push('缺少 sections 字段');
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Parse a backup file, validate structure, and return manifest + ZIP reference.
   *
   * @param {File} file - The .zip backup file
   * @returns {Promise<{ manifest: Object, zip: JSZip, errors: string[], valid: boolean }>}
   */
  async function parseBackupFile(file) {
    const errors = [];

    // Basic file type check
    if (!file.name.endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      // Be lenient — some browsers / OSes don't set MIME correctly
      debug(`Backup file MIME: "${file.type}", name: "${file.name}" — attempting to parse anyway`);
    }

    /** @type {JSZip} */
    let zip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (e) {
      errors.push('无法解析备份文件 — 文件可能已损坏或不是有效的 ZIP 格式');
      return { manifest: null, zip: null, errors, valid: false };
    }

    // Check for manifest.json
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      errors.push('备份文件中缺少 manifest.json');
      return { manifest: null, zip: null, errors, valid: false };
    }

    /** @type {Object} */
    let manifest;
    try {
      const text = await manifestFile.async('text');
      manifest = JSON.parse(text);
    } catch (e) {
      errors.push('manifest.json 解析失败');
      return { manifest: null, zip: null, errors, valid: false };
    }

    const { valid, errors: validationErrors } = validateManifest(manifest);
    errors.push(...validationErrors);

    // Check for expected section files
    if (manifest.sections) {
      if (manifest.sections.settings && !zip.file('settings.json')) {
        errors.push('manifest 声明包含设置数据但 settings.json 缺失');
      }
      if (manifest.sections.progress && !zip.file('progress.json')) {
        errors.push('manifest 声明包含学习进度但 progress.json 缺失');
      }
      if (manifest.sections.imagePool && !zip.file('pool-meta.json')) {
        errors.push('manifest 声明包含图片池但 pool-meta.json 缺失');
      }
    }

    return { manifest, zip, errors, valid: valid && errors.length === 0 };
  }

  /**
   * Build a human-readable summary string from a parsed manifest.
   * @param {Object} manifest
   * @returns {string[]}
   */
  function buildSummary(manifest) {
    const lines = [];
    if (!manifest || !manifest.sections) return lines;

    if (manifest.scriptVersion) {
      lines.push(`脚本版本: v${manifest.scriptVersion}`);
    }
    if (manifest.exportedAt) {
      const d = new Date(manifest.exportedAt);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      lines.push(`导出时间: ${date} ${time}`);
    }

    const s = manifest.sections;
    if (s.settings) {
      lines.push(`设置: ${s.settings.count || '?'} 项`);
    }
    if (s.progress) {
      const parts = [];
      if (typeof s.progress.sessions === 'number') parts.push(`${s.progress.sessions} 次学习`);
      if (typeof s.progress.courses === 'number') parts.push(`${s.progress.courses} 门课程`);
      lines.push(`学习进度: ${parts.join(', ') || '有数据'}`);
    }
    if (s.imagePool) {
      const parts = [`${s.imagePool.count || 0} 张图片`];
      if (s.imagePool.withOriginals) parts.push(`${s.imagePool.withOriginals} 张含原图`);
      lines.push(`图片池: ${parts.join(', ')}`);
    }

    return lines;
  }

  // ---------------------------------------------------------------------------
  // Import execution
  // ---------------------------------------------------------------------------

  /**
   * Merge two progress objects, keeping existing data and adding incoming.
   * Sessions are deduplicated by ID. Courses merge with max-values strategy.
   *
   * @param {Object} existing
   * @param {Object} incoming
   * @returns {Object}
   */
  function mergeProgress(existing, incoming) {
    const existingIds = new Set((existing.sessions || []).map(s => s.id));

    // Merge sessions: keep all existing, add incoming ones not already present
    const mergedSessions = [...(existing.sessions || [])];
    let addedSessions = 0;
    for (const sess of (incoming.sessions || [])) {
      if (!existingIds.has(sess.id)) {
        mergedSessions.push(sess);
        addedSessions++;
      }
    }

    // Merge courses: max completedCount, max lastStudy
    const mergedCourses = { ...(existing.courses || {}) };
    for (const [courseId, incomingCourse] of Object.entries(incoming.courses || {})) {
      if (mergedCourses[courseId]) {
        const ec = mergedCourses[courseId];
        const ic = /** @type {Object} */ (incomingCourse);
        // Build a new object instead of mutating the existing reference
        const ecSessions = new Set([...(ec.sessions || [])]);
        for (const sid of (ic.sessions || [])) ecSessions.add(sid);
        mergedCourses[courseId] = {
          name: ec.name || ic.name,
          totalLessons: Math.max(ec.totalLessons || 0, ic.totalLessons || 0),
          completedCount: Math.max(ec.completedCount || 0, ic.completedCount || 0),
          lastStudy: Math.max(ec.lastStudy || 0, ic.lastStudy || 0),
          firstStudy: ec.firstStudy || ic.firstStudy || Date.now(),
          sessions: [...ecSessions],
        };
      } else {
        mergedCourses[courseId] = { ...ic };
      }
    }

    debug(`Progress merge: ${addedSessions} new sessions added, ${Object.keys(mergedCourses).length} total courses`);

    return {
      version: existing.version || incoming.version || 1,
      sessions: mergedSessions,
      courses: mergedCourses,
      lastSync: Date.now(),
    };
  }

  /**
   * Execute the actual import of data from a parsed backup ZIP.
   *
   * @param {JSZip} zip - JSZip instance from parseBackupFile()
   * @param {{ settings: boolean, progress: boolean, imagePool: boolean }} sections
   * @param {{ settings: 'replace', progress: 'replace'|'merge', imagePool: 'replace'|'merge' }} strategies
   * @param {(phase: string, pct: number, detail?: string) => void} [onProgress]
   * @returns {Promise<{ settings: { imported: number }|null, progress: { sessions: number, courses: number }|null, imagePool: { added: number, skipped: number }|null }>}
   */
  async function executeImport(zip, sections, strategies, onProgress) {
    /** @type {{ settings: any, progress: any, imagePool: any }} */
    const results = { settings: null, progress: null, imagePool: null };

    // ---- Phase 1: Settings ----
    if (sections.settings) {
      onProgress?.('settings', 0, '正在导入设置...');
      try {
        const raw = await zip.file('settings.json').async('text');
        const data = JSON.parse(raw);
        let count = 0;
        const keys = ['faceAutoClick', 'videoReplace', 'autoCompare', 'autoCourse', 'disableVisibilityCheck', 'dynamicWeight'];
        for (const key of keys) {
          if (key in data) {
            setSetting(key, data[key]);
            count++;
          }
        }
        results.settings = { imported: count };
        onProgress?.('settings', 100, `已导入 ${count} 项设置`);
      } catch (e) {
        warn('Settings import failed:', e);
        throw new Error(`设置导入失败: ${e.message}`);
      }
    }

    // ---- Phase 2: Learning progress ----
    if (sections.progress) {
      onProgress?.('progress', 0, '正在导入学习进度...');
      try {
        const raw = await zip.file('progress.json').async('text');
        const incoming = JSON.parse(raw);

        if (strategies.progress === 'replace') {
          await clearAllProgress();
          await getStorageAdapter().set(PROGRESS_TRACKER_KEY, JSON.stringify(incoming));
          results.progress = {
            sessions: (incoming.sessions || []).length,
            courses: Object.keys(incoming.courses || {}).length,
          };
        } else {
          // merge
          const existing = getProgressData();
          const merged = mergeProgress(existing, incoming);
          await getStorageAdapter().set(PROGRESS_TRACKER_KEY, JSON.stringify(merged));
          results.progress = {
            sessions: merged.sessions.length,
            courses: Object.keys(merged.courses).length,
          };
        }

        // Reload in-memory state from storage
        await reloadProgress();
        onProgress?.('progress', 100, '学习进度已导入');
      } catch (e) {
        warn('Progress import failed:', e);
        throw new Error(`学习进度导入失败: ${e.message}`);
      }
    }

    // ---- Phase 3: Image pool ----
    if (sections.imagePool) {
      onProgress?.('imagePool', 0, '正在导入图片池...');
      try {
        const poolMetaText = await zip.file('pool-meta.json').async('text');
        const incomingMeta = JSON.parse(poolMetaText);

        let poolStatsText;
        let incomingStats = {};
        const statsFile = zip.file('pool-stats.json');
        if (statsFile) {
          poolStatsText = await statsFile.async('text');
          incomingStats = JSON.parse(poolStatsText);
        }

        const incomingEntries = incomingMeta.entries || [];
        const incomingCount = incomingEntries.length;

        if (strategies.imagePool === 'replace') {
          // Clear existing pool
          await clearPool();
          const adapter = getStorageAdapter();

          /** Successfully imported entries (in order, excluding skipped). */
          const importedEntries = [];
          for (let i = 0; i < incomingCount; i++) {
            const entry = incomingEntries[i];

            // Read cropped JPEG from ZIP as base64, then build a valid data URI.
            // Using async('blob') loses the MIME type (JSZip produces
            // application/octet-stream), which causes the data:image/ prefix
            // check to fail.  async('base64') avoids this entirely.
            const croppedFile = zip.file(`images/${entry.id}_cropped.jpg`);
            if (!croppedFile) {
              warn(`Missing cropped image for entry ${entry.id}, skipping`);
              continue;
            }

            const croppedBase64 = await croppedFile.async('base64');
            const croppedDataUrl = 'data:image/jpeg;base64,' + croppedBase64;

            // Store cropped image
            const imgKey = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + entry.id;
            await adapter.set(imgKey, croppedDataUrl);

            // Original image (optional)
            const origFile = zip.file(`images/${entry.id}_original.jpg`);
            if (origFile) {
              try {
                const origBase64 = await origFile.async('base64');
                const origDataUrl = 'data:image/jpeg;base64,' + origBase64;
                const origKey = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + 'orig_' + entry.id;
                await adapter.set(origKey, origDataUrl);
              } catch (_) {
                // Original is best-effort
                debug(`No original image for entry ${entry.id}, skipping`);
              }
            }

            importedEntries.push(entry);
            onProgress?.('imagePool',
              Math.round((i + 1) / incomingCount * 100),
              `正在导入图片 (${i + 1}/${incomingCount})...`,
            );
          }

          // Persist metadata (only successfully imported entries)
          const newMeta = {
            version: 1,
            nextId: importedEntries.length > 0
              ? importedEntries.reduce((max, e) => Math.max(max, e.id), 0) + 1
              : 0,
            entries: importedEntries,
          };
          await adapter.set(IMAGE_POOL_CONFIG.META_KEY, JSON.stringify(newMeta));

          // Persist stats (filter to imported entries)
          const importedIds = new Set(importedEntries.map(e => e.id));
          const filteredStats = {};
          for (const [idStr, stat] of Object.entries(incomingStats)) {
            if (importedIds.has(Number(idStr))) {
              filteredStats[idStr] = stat;
            }
          }
          await adapter.set(IMAGE_POOL_CONFIG.STATS_KEY, JSON.stringify(filteredStats));

          // Reload in-memory pool state
          await reloadPool();

          results.imagePool = {
            added: importedEntries.length,
            skipped: incomingCount - importedEntries.length,
          };
        } else {
          // merge strategy
          const existingEntries = listEntries();
          const existingIds = new Set(existingEntries.map(e => e.id));
          const adapter = getStorageAdapter();

          // Load existing meta to get nextId
          const rawMeta = await adapter.get(IMAGE_POOL_CONFIG.META_KEY);
          const existingMeta = rawMeta ? JSON.parse(rawMeta) : { nextId: 0, entries: [] };
          let nextId = existingMeta.nextId || 0;

          const mergedEntries = [...existingMeta.entries || []];
          const mergedStats = { ...getAllStats() };

          let added = 0;
          let skipped = 0;

          for (let i = 0; i < incomingCount; i++) {
            const entry = incomingEntries[i];
            const newId = nextId++;

            const croppedFile = zip.file(`images/${entry.id}_cropped.jpg`);
            if (!croppedFile) {
              skipped++;
              continue;
            }

            try {
              const croppedBase64 = await croppedFile.async('base64');
              const croppedDataUrl = 'data:image/jpeg;base64,' + croppedBase64;

              // Store with new ID
              const imgKey = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + newId;
              await adapter.set(imgKey, croppedDataUrl);

              // Original
              let cropParams = entry.cropParams;
              const origFile = zip.file(`images/${entry.id}_original.jpg`);
              if (origFile && cropParams) {
                try {
                  const origBase64 = await origFile.async('base64');
                  const origDataUrl = 'data:image/jpeg;base64,' + origBase64;
                  const origKey = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + 'orig_' + newId;
                  await adapter.set(origKey, origDataUrl);
                } catch (_) {
                  cropParams = null;
                }
              } else {
                cropParams = null;
              }

              // Add to merged entries (keep incoming hash for reference, no re-hash)
              mergedEntries.push({
                id: newId,
                name: entry.name || `imported_${entry.id}`,
                hash: entry.hash || null,
                size: croppedDataUrl.length,
                width: entry.width || 0,
                height: entry.height || 0,
                addedAt: Date.now(),
                cropParams,
                origWidth: entry.origWidth || 0,
                origHeight: entry.origHeight || 0,
              });

              // Merge stats
              if (incomingStats[String(entry.id)]) {
                mergedStats[String(newId)] = incomingStats[String(entry.id)];
              }

              added++;
            } catch (_) {
              skipped++;
            }

            const processed = i + 1;
            onProgress?.('imagePool',
              Math.round(processed / incomingCount * 100),
              `正在导入图片 (${processed}/${incomingCount})...`,
            );
          }

          // Persist merged meta and stats
          const mergedMeta = { version: 1, nextId, entries: mergedEntries };
          await adapter.set(IMAGE_POOL_CONFIG.META_KEY, JSON.stringify(mergedMeta));
          await adapter.set(IMAGE_POOL_CONFIG.STATS_KEY, JSON.stringify(mergedStats));

          // Reload
          await reloadPool();

          results.imagePool = { added, skipped };
        }

        onProgress?.('imagePool', 100, `图片池导入完成 (${results.imagePool.added} 张)`);
      } catch (e) {
        warn('Image pool import failed:', e);
        throw new Error(`图片池导入失败: ${e.message}`);
      }
    }

    return results;
  }

  /**
   * @file UI builder — creates and renders the edge-drawer panel DOM.
   *
   * Panel structure:
   *   .bfw-panel (edge-drawer container, slides on hover)
   *     .bfw-panel-handle (32px grip tab, always visible on right edge)
   *     .bfw-panel-inner (348px content surface)
   *       .bfw-panel-header  (title + pin button)
   *       .bfw-panel-body    (scrollable: status, log, actions, pool)
   */


  let panelEl = null;

  /** Cached course progress data (written by course-processor, read by UI updates). */
  let courseProgressData = {
    chapterCount: 0, totalLessons: 0, completedLessons: 0,
    currentChapter: '', currentName: '', curChapLessons: 0, curChapDone: 0,
    remainingMinutes: 0,
    videoProgress: 0, autoCourseEnabled: false,
  };

  /**
   * Update the course progress display in the panel.
   * Called by course-processor on every progress tick.
   *
   * Bars:
   *   章 = lessons done / total lessons in the CURRENT chapter
   *   总 = all lessons done / all lessons across every chapter
   *
   * @param {Object} data - Progress data from course-processor
   */
  function updateCourseProgress(data) {
    courseProgressData = { ...data };
    refreshCourseProgress();
  }

  /** Cached last-written DOM values — avoids redundant DOM mutations. */
  const _lastDom = {};

  /**
   * Write textContent only if the value differs from what's already in the DOM.
   * Returns true if a write actually happened.
   * @param {Element} el
   * @param {string} value
   * @returns {boolean}
   */
  function setTextIfChanged(el, value) {
    const key = el.id || el.className;
    if (_lastDom[key] === value) return false;
    _lastDom[key] = value;
    el.textContent = value;
    return true;
  }

  /**
   * Write a style property only if the value differs from the cached state.
   * @param {Element} el
   * @param {string} prop
   * @param {string} value
   * @returns {boolean}
   */
  function setStyleIfChanged(el, prop, value) {
    const key = `${el.id || el.className}_${prop}`;
    if (_lastDom[key] === value) return false;
    _lastDom[key] = value;
    el.style[prop] = value;
    return true;
  }

  /**
   * Refresh the course progress DOM from cached data.
   * Skips redundant writes when values haven't changed, avoiding
   * unnecessary layout recalculations during frequent pushProgress calls.
   */
  function refreshCourseProgress() {
    if (!panelEl) return;
    const d = courseProgressData;

    // Current video playback as a 0.0–1.0 fraction (0 when not playing / not loaded)
    const vidFrac = (d.videoProgress || 0) / 100;

    // ---- Current-chapter progress (fractional: includes video position) ----
    // Capped at 1.0: when replaying a completed lesson (studyStatus===3),
    // that lesson is already counted in curChapDone, so raw vidFrac addition
    // can push the fraction above 1.0.
    const chapFraction = d.curChapLessons > 0
      ? Math.min((d.curChapDone + vidFrac) / d.curChapLessons, 1)
      : 0;
    const chapPct = Math.round(chapFraction * 100);

    // ---- Overall progress (fractional: includes video position) ----
    const overallFraction = d.totalLessons > 0
      ? Math.min((d.completedLessons + vidFrac) / d.totalLessons, 1)
      : 0;
    const overallPct = Math.round(overallFraction * 100);

    // ---- Chapter bar (本章) ----
    const chBarFill = panelEl.querySelector('#bfw-course-chbar-fill');
    if (chBarFill) setStyleIfChanged(chBarFill, 'width', `${Math.min(chapPct, 100)}%`);
    const chBarPct = panelEl.querySelector('#bfw-course-chbar-pct');
    if (chBarPct) setTextIfChanged(chBarPct, d.curChapLessons ? `${chapPct}%` : '');

    // ---- Overall bar (总) ----
    const lBarFill = panelEl.querySelector('#bfw-course-lbar-fill');
    if (lBarFill) setStyleIfChanged(lBarFill, 'width', `${Math.min(overallPct, 100)}%`);
    const lBarPct = panelEl.querySelector('#bfw-course-lbar-pct');
    if (lBarPct) setTextIfChanged(lBarPct, d.totalLessons ? `${overallPct}%` : '');

    // ---- Count badge ----
    const countEl = panelEl.querySelector('#bfw-course-count');
    if (countEl) {
      const countText = d.totalLessons ? `${d.completedLessons}/${d.totalLessons}` : '0/0';
      setTextIfChanged(countEl, countText);
      const countColor = d.totalLessons > 0 && d.completedLessons >= d.totalLessons ? '#a6e3a1' : '#a6adc8';
      setStyleIfChanged(countEl, 'color', countColor);
    }

    // ---- Chapter label (right of header) ----
    const chLabel = panelEl.querySelector('#bfw-course-ch-label');
    if (chLabel) {
      const labelText = d.curChapLessons ? `本章 ${d.curChapDone}/${d.curChapLessons}` : '';
      setTextIfChanged(chLabel, labelText);
      setStyleIfChanged(chLabel, 'display', d.curChapLessons ? '' : 'none');
    }

    // ---- Current lesson ----
    const nameEl = panelEl.querySelector('#bfw-course-current-name');
    if (nameEl) {
      setTextIfChanged(nameEl, d.currentName || (d.totalLessons > 0 ? '就绪…' : '等待课程…'));
    }
    const chNameEl = panelEl.querySelector('#bfw-course-current-chapter');
    if (chNameEl) {
      setTextIfChanged(chNameEl, d.currentChapter || '');
    }

    // ---- Video progress ----
    const vidPctEl = panelEl.querySelector('#bfw-course-vid-pct');
    if (vidPctEl) {
      setTextIfChanged(vidPctEl, d.currentName ? `视频 ${d.videoProgress || 0}%` : '');
    }

    // ---- Stat line ----
    const statEl = panelEl.querySelector('#bfw-course-stat');
    if (statEl) {
      const parts = [];
      if (d.autoCourseEnabled) parts.push('自动播放: 开');
      parts.push(`${d.chapterCount} 章`);
      parts.push(`${d.completedLessons}/${d.totalLessons} 课`);
      if (d.remainingMinutes > 0) {
        parts.push(d.remainingMinutes >= 60
          ? `剩余约 ${Math.round(d.remainingMinutes / 60)}h`
          : `剩余约 ${d.remainingMinutes}min`);
      }
      setTextIfChanged(statEl, parts.join(' · '));
    }
  }

  /**
   * Render the thumbnail grid + pool status from current pool state.
   * @param {HTMLElement} panel
   */
  /**
   * Reload the thumbnail image for a specific entry after crop edit.
   * Avoids a full pool rebuild when only one image's content changed.
   * @param {HTMLElement} panel
   * @param {number} entryId
   */
  async function refreshPoolThumb(panel, entryId) {
    const target = panel || panelEl;
    if (!target) return;

    const thumb = target.querySelector(`.bfw-pool-thumb[data-id="${entryId}"]`);
    if (!thumb) return;

    await loadThumbImage(thumb, entryId);
  }

  function refreshPoolUI(panel) {
    const target = panel || panelEl;
    if (!target) return;

    // Close any open stats popup before rebuilding thumbs (prevents memory leaks)
    hideStatsPopup();

    const thumbsEl = target.querySelector('#bfw-pool-thumbs');
    const countEl = target.querySelector('#bfw-pool-count');
    const emptyEl = target.querySelector('#bfw-pool-empty');
    const clearBtn = target.querySelector('#bfw-btn-clear-pool');

    if (!thumbsEl || !countEl) return;

    const entries = listEntries();
    const count = entries.length;
    const cap = poolCapacity();

    // Count badge
    countEl.textContent = `${count}/${cap}`;
    countEl.style.color = count >= cap ? '#f38ba8' : '#a6adc8';

    // Clear button state
    if (clearBtn) clearBtn.disabled = count === 0;

    // Empty placeholder
    if (emptyEl) emptyEl.style.display = count === 0 ? 'block' : 'none';

    // Thumbnails — incremental update: only rebuild if count changed
    const currentThumbs = thumbsEl.querySelectorAll('.bfw-pool-thumb');
    if (currentThumbs.length !== count) {
      thumbsEl.innerHTML = '';
      if (count === 0) {
        thumbsEl.appendChild(emptyEl || document.createElement('div'));
      } else {
        for (const entry of entries) {
          const thumb = createThumbElement(entry);
          thumbsEl.appendChild(thumb);
          // Load actual image data lazily
          loadThumbImage(thumb, entry.id);
        }
      }
    }

    // Close any open stats popup (thumb elements were rebuilt)
    hideStatsPopup();
  }

  // ---------------------------------------------------------------------------
  // Stats popup — inline tooltip for per-image usage statistics
  // ---------------------------------------------------------------------------

  /** Currently visible stats popup element (null when hidden). */
  let _statsPopupEl = null;

  /** Timeout handle for delayed popup hide on mouseleave (debounce). */
  let _statsPopupTimeout = null;

  /**
   * Build a stats popup DOM for an image.  Returns the popup element
   * but does NOT attach it to the DOM.
   *
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   * @returns {HTMLElement}
   */
  function createStatsPopup(entry) {
    const stats = getImageStats(entry.id);
    const tier = getImageQualityTier(entry.id);

    const popup = document.createElement('div');
    popup.className = 'bfw-thumb-stats-popup';
    popup.dataset.id = String(entry.id);

    // Tier badge label
    const tierLabels = { high: '高成功率', neutral: '中性', low: '低成功率' };
    const tierCss = { high: 'stats-tier-high', neutral: 'stats-tier-neutral', low: 'stats-tier-low' };

    if (!stats || stats.totalUses === 0) {
      popup.innerHTML = `
      <div class="stats-header">
        <span class="stats-name">${escapeHtml(entry.name)}</span>
        <span class="stats-tier-badge ${tierCss[tier]}">${tierLabels[tier]}</span>
      </div>
      <div class="stats-empty">暂无使用数据</div>`;
    } else {
      const successRate = stats.totalUses > 0
        ? Math.round((stats.successes / stats.totalUses) * 100)
        : 0;
      const rateClass = successRate >= 50 ? 'rate-good' : 'rate-bad';
      const lastResultText = stats.lastResult === 'success' ? '✅ 通过'
        : stats.lastResult === 'fail' ? '❌ 未通过' : '—';

      popup.innerHTML = `
      <div class="stats-header">
        <span class="stats-name">${escapeHtml(entry.name)}</span>
        <span class="stats-tier-badge ${tierCss[tier]}">${tierLabels[tier]}</span>
      </div>
      <table class="stats-table">
        <tr><td class="stats-label">使用次数</td><td class="stats-value">${stats.totalUses}</td></tr>
        <tr><td class="stats-label">成功</td><td class="stats-value success">${stats.successes}</td></tr>
        <tr><td class="stats-label">失败</td><td class="stats-value fail">${stats.failures}</td></tr>
        <tr><td class="stats-label">成功率</td><td class="stats-value ${rateClass}">${successRate}%</td></tr>
        <tr><td class="stats-label">最近结果</td><td class="stats-value">${lastResultText}</td></tr>
      </table>`;
    }

    // Keep popup visible while cursor is over it (hover-triggered tooltip pattern)
    popup.addEventListener('mouseenter', () => {
      if (_statsPopupTimeout) {
        clearTimeout(_statsPopupTimeout);
        _statsPopupTimeout = null;
      }
    });
    popup.addEventListener('mouseleave', () => {
      hideStatsPopup();
    });

    return popup;
  }

  /**
   * Escape HTML entities in a string to prevent XSS.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Show the stats popup for a thumbnail element (hover-triggered).
   * Closes any previously open popup first.  If the popup for this
   * entry is already visible the call is a no-op.
   *
   * @param {HTMLElement} thumbEl - The .bfw-pool-thumb element
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   */
  function showStatsPopup(thumbEl, entry) {
    // Already showing for this entry — nothing to do
    if (_statsPopupEl && _statsPopupEl.dataset.id === String(entry.id) && _statsPopupEl.parentNode) {
      return;
    }

    // Cancel any pending hide
    if (_statsPopupTimeout) {
      clearTimeout(_statsPopupTimeout);
      _statsPopupTimeout = null;
    }

    // Close any existing popup
    hideStatsPopup();

    // Create and show new popup
    _statsPopupEl = createStatsPopup(entry);

    // Always attach to <body> — the panel (.bfw-panel) has a CSS transform
    // which creates a new containing block, so any position:fixed descendant
    // is relative to the panel (not the viewport) and gets clipped by
    // overflow-y: auto on .bfw-panel-body.
    document.body.appendChild(_statsPopupEl);

    // Position the popup near the thumbnail
    positionStatsPopup(thumbEl, _statsPopupEl);
  }

  /**
   * Schedule a deferred hide of the stats popup.
   * Gives the cursor time to reach the popup itself before it disappears.
   */
  function scheduleHideStatsPopup() {
    _statsPopupTimeout = setTimeout(() => {
      hideStatsPopup();
    }, 200);
  }

  /**
   * Position the stats popup relative to its thumbnail element.
   * Tries to place it to the right, falling back to left / above / below.
   *
   * @param {HTMLElement} thumbEl
   * @param {HTMLElement} popup
   */
  function positionStatsPopup(thumbEl, popup) {
    const thumbRect = thumbEl.getBoundingClientRect();
    const popupW = 200;
    const popupH = popup.offsetHeight || 140;

    // Default: to the right of the thumb
    let left = thumbRect.right + 8;
    let top = thumbRect.top;

    // If it would overflow right edge of viewport, flip to left
    if (left + popupW > window.innerWidth - 10) {
      left = thumbRect.left - popupW - 8;
    }
    // If still overflows left edge, place below
    if (left < 10) {
      left = thumbRect.left;
      top = thumbRect.bottom + 4;
    }
    // If overflows bottom, place above
    if (top + popupH > window.innerHeight - 10) {
      top = thumbRect.top - popupH - 4;
    }
    // Clamp to viewport
    top = Math.max(4, top);
    left = Math.max(4, left);

    popup.style.position = 'fixed';
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  /**
   * Hide and remove the currently visible stats popup.
   * Safe to call when no popup is open (no-op).
   */
  function hideStatsPopup() {
    if (_statsPopupTimeout) {
      clearTimeout(_statsPopupTimeout);
      _statsPopupTimeout = null;
    }
    if (_statsPopupEl) {
      if (_statsPopupEl.parentNode) _statsPopupEl.parentNode.removeChild(_statsPopupEl);
      _statsPopupEl = null;
    }
  }

  /**
   * Create a thumbnail DOM element for a pool entry.
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   * @returns {HTMLElement}
   */
  function createThumbElement(entry) {
    const div = document.createElement('div');
    div.className = 'bfw-pool-thumb';
    div.title = `${entry.name}\n${entry.width}×${entry.height} — 点击编辑裁剪`;
    div.dataset.id = String(entry.id);

    // Quality tier border class
    const tier = getImageQualityTier(entry.id);
    if (tier === 'low') div.classList.add('bfw-quality-low');
    else if (tier === 'high') div.classList.add('bfw-quality-high');

    const img = document.createElement('img');
    img.alt = entry.name;
    img.src = ''; // lazy
    div.appendChild(img);

    // Stats info icon — hover shows usage stats popup (see showStatsPopup)
    const infoBtn = document.createElement('button');
    infoBtn.className = 'bfw-thumb-info';
    infoBtn.innerHTML = icons.info;
    infoBtn.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      showStatsPopup(div, entry);
    });
    infoBtn.addEventListener('mouseleave', () => {
      scheduleHideStatsPopup();
    });
    div.appendChild(infoBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'bfw-thumb-delete';
    delBtn.innerHTML = icons.x;
    delBtn.title = '删除';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Dispatch to panel so events.js handles it
      panelEl?.dispatchEvent(new CustomEvent('bfw:delete-image', {
        detail: { id: entry.id },
      }));
    });
    div.appendChild(delBtn);

    // Click to open crop editor
    div.addEventListener('click', () => {
      // Don't open crop editor if clicking the info button (handled above)
      if (!entry.cropParams) return; // No original data available
      openCropEditor(entry.id, entry, () => {
        // Reload just this thumbnail — content changed, count unchanged
        refreshPoolThumb(panelEl, entry.id);
      });
    });

    return div;
  }

  /**
   * Load the image data for a thumbnail element.
   * @param {HTMLElement} thumbEl
   * @param {number} id
   */
  async function loadThumbImage(thumbEl, id) {
    try {
      const dataUrl = await getImageData(id);
      if (dataUrl) {
        const img = thumbEl.querySelector('img');
        if (img) img.src = dataUrl;
      }
    } catch (_) { /* thumb load failure is non-fatal */ }
  }

  /**
   * MutationObserver for watching version element appear.
   * Disconnects automatically after detecting the version.
   */
  let versionObserver = null;

  // ---------------------------------------------------------------------------
  // Footer left — compat version display
  // ---------------------------------------------------------------------------

  function buildFooterLeftHtml(compatInfo) {
    const iconSvg = icons[compatInfo.iconKey] || icons.versionMissing;

    if (compatInfo.pageVersion) {
      return `<span class="bfw-footer-compat" style="color: ${compatInfo.color}" title="${compatInfo.message}">${iconSvg}</span>
       <span class="bfw-footer-version">v${SCRIPT_VERSION}</span>
       <span class="bfw-footer-sep">|</span>
       <span class="bfw-footer-page">页面 v${compatInfo.pageVersion}</span>`;
    }
    return `<span class="bfw-footer-compat" style="color: ${compatInfo.color}" title="${compatInfo.message}">${iconSvg}</span>
       <span class="bfw-footer-version">v${SCRIPT_VERSION}</span>`;
  }

  function updateFooterContent(footer, compatInfo) {
    const leftEl = footer.querySelector('.bfw-footer-left');
    if (!leftEl) return;
    leftEl.innerHTML = buildFooterLeftHtml(compatInfo);
  }

  // ---------------------------------------------------------------------------
  // Footer right — update badge
  // ---------------------------------------------------------------------------

  const TYPE_LABELS = {
    feature:     '新功能',
    fix:         '修复',
    improvement: '优化',
    performance: '性能',
    security:    '安全',
    breaking:    '破坏性',
    docs:        '文档',
    internal:    '内部',
  };

  /**
   * Map short form types from the Worker API to canonical internal types.
   * Worker uses conventional-commit abbreviations (feat, change, perf);
   * the front-end expects full names for CSS class and label lookup.
   * Types not listed here pass through unchanged (e.g. "fix", "security").
   * @type {Record<string, string>}
   */
  const TYPE_ALIASES = {
    feat:    'feature',
    change:  'improvement',
    perf:    'performance',
  };

  /**
   * Render the changelog card DOM.
   * @param {import('../utils/update-checker.js').UpdateResult} result
   * @param {() => void} onRecheck — called when the user clicks "重新检测"
   * @param {() => void} onIgnore  — called when the user clicks "忽略此版本"
   * @returns {HTMLElement}
   */
  function createUpdateCard(result, onRecheck, onIgnore) {
    const card = document.createElement('div');
    card.className = 'bfw-update-card';

    // Static skeleton — no remote content here
    card.innerHTML = `
    <div class="bfw-update-card-header">
      <span class="bfw-update-card-title">
        ${icons.arrowUpCircle} 发现新版本
      </span>
      <button class="bfw-update-card-close" title="关闭">${icons.x}</button>
    </div>
    <div class="bfw-update-card-meta">
      <span>v${SCRIPT_VERSION}</span>
      <span class="arrow">${icons.arrowRight}</span>
      <span class="version-badge"></span>
      <button class="bfw-update-recheck-btn" title="重新检测">${icons.refresh}</button>
    </div>
    <div class="bfw-update-changelog"></div>
    <div class="bfw-update-card-actions">
      <button class="bfw-update-ignore-btn">忽略此版本</button>
      <button class="bfw-update-install-btn">立即安装</button>
    </div>
  `;

    // ---- Version badge — clickable when releaseUrl exists ----
    const versionBadge = card.querySelector('.version-badge');
    if (result.releaseUrl) {
      const link = document.createElement('a');
      link.className = 'bfw-version-badge-link';
      link.href = result.releaseUrl;
      link.target = '_blank';
      link.title = '查看发布说明';
      link.innerHTML = `${icons.tag} <span class="bfw-latest-ver"></span>`;
      link.querySelector('.bfw-latest-ver').textContent = `v${result.latestVersion}`;
      versionBadge.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.className = 'bfw-version-badge-link';
      span.innerHTML = `${icons.tag} <span class="bfw-latest-ver">v${result.latestVersion}</span>`;
      versionBadge.appendChild(span);
    }

    // ---- Changelog entries ----
    const changelogEl = card.querySelector('.bfw-update-changelog');
    const entries = result.changelog.slice(0, 8);
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'bfw-update-changelog-empty';
      empty.textContent = '暂无详细更新说明';
      changelogEl.appendChild(empty);
    } else {
      entries.forEach((e) => {
        const row = document.createElement('div');
        row.className = 'bfw-changelog-entry';

        const typeSpan = document.createElement('span');
        const rawType = /^[a-z]+$/.test(e.type) ? e.type : 'internal';
        const canonicalType = TYPE_ALIASES[rawType] || rawType;
        typeSpan.className = `bfw-changelog-type bfw-type-${canonicalType}`;
        typeSpan.textContent = TYPE_LABELS[canonicalType] ?? e.type;

        const textSpan = document.createElement('span');
        textSpan.className = 'bfw-changelog-text';
        textSpan.textContent = e.title;
        if (e.description) {
          const desc = document.createElement('span');
          desc.className = 'desc';
          desc.textContent = e.description;
          textSpan.appendChild(desc);
        }

        row.appendChild(typeSpan);
        row.appendChild(textSpan);
        changelogEl.appendChild(row);
      });
    }

    // ---- Button bindings ----

    // Close button
    card.querySelector('.bfw-update-card-close').addEventListener('click', () => {
      card.remove();
    });

    // Install button
    card.querySelector('.bfw-update-install-btn').addEventListener('click', () => {
      if (result.downloadUrl) window.open(result.downloadUrl, '_blank');
      card.remove();
    });

    // Ignore button
    card.querySelector('.bfw-update-ignore-btn').addEventListener('click', () => {
      onIgnore();
      card.remove();
    });

    // Recheck button
    card.querySelector('.bfw-update-recheck-btn').addEventListener('click', () => {
      onRecheck();
      card.remove();
    });

    // Click outside to close
    setTimeout(() => {
      const onOutside = (e) => {
        if (!card.contains(e.target)) {
          card.remove();
          document.removeEventListener('click', onOutside);
        }
      };
      document.addEventListener('click', onOutside);
    }, 0);

    return card;
  }

  /**
   * Create the update badge button in the footer-right area.
   * Starts in "checking" state; transitions to idle or has-update after the
   * checkForUpdate callback fires.
   *
   * @param {HTMLElement} footer
   * @returns {HTMLElement} The badge button element
   */
  function createUpdateBadge(footer) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';

    const btn = document.createElement('button');
    btn.className = 'bfw-update-btn checking';
    btn.title = '正在检测更新…';
    btn.innerHTML = `<span class="bfw-icon-spin">${icons.loader}</span>`;
    wrapper.appendChild(btn);

    // triggerRecheck and onError are mutually referencing — use let to allow forward reference
    let triggerRecheck;

    const onError = () => {
      btn.className = 'bfw-update-btn';
      btn.title = '检测更新失败，点击重试';
      btn.innerHTML = icons.tag;
      btn.onclick = (e) => { e.stopPropagation(); triggerRecheck(); };
    };

    triggerRecheck = () => {
      btn.className = 'bfw-update-btn checking';
      btn.title = '正在检测更新…';
      btn.innerHTML = `<span class="bfw-icon-spin">${icons.loader}</span>`;
      btn.onclick = null;
      clearIgnoredVersion();
      invalidateUpdateCache();
      checkForUpdate(onResult, { force: true, delay: 0, onError });
    };

    // Called when checkForUpdate resolves
    const onResult = (result) => {

      if (!result.hasUpdate) {
        // Quiet badge — up to date or version ignored
        btn.className = 'bfw-update-btn';
        if (result.ignoredVersion) {
          btn.title = `v${result.ignoredVersion} 已忽略，点击重新检测`;
          btn.innerHTML = icons.tag;
        } else {
          btn.title = `已是最新版本 v${result.latestVersion}，点击重新检测`;
          btn.innerHTML = icons.tag;
        }
        btn.onclick = (e) => { e.stopPropagation(); triggerRecheck(); };
        return;
      }

      // Has update — orange pulsing badge
      btn.className = 'bfw-update-btn has-update';
      btn.title = `发现新版本 v${result.latestVersion}，点击查看`;
      btn.innerHTML = `${icons.arrowUpCircle}<span style="font-weight:600;">v${result.latestVersion}</span>`;

      // Use onclick (not addEventListener) so re-check via contextmenu never stacks listeners
      btn.onclick = (e) => {
        e.stopPropagation();
        const existing = wrapper.querySelector('.bfw-update-card');
        if (existing) { existing.remove(); return; }

        const onIgnore = () => {
          ignoreVersion(result.latestVersion);
          // Re-apply the ignore filter and update badge state
          onResult({
            ...result,
            hasUpdate: false,
            ignoredVersion: result.latestVersion,
          });
        };

        wrapper.appendChild(createUpdateCard(result, triggerRecheck, onIgnore));
      };
    };

    checkForUpdate(onResult, { onError });

    return wrapper;
  }

  // ---------------------------------------------------------------------------
  // Footer assembly
  // ---------------------------------------------------------------------------

  function createFooter() {
    const footer = document.createElement('div');
    footer.className = 'bfw-footer';
    footer.id = 'bfw-footer';

    const initialInfo = {
      iconKey: 'versionMissing',
      color: '#8c8c8c',
      message: '正在检测版本...',
      pageVersion: null,
    };

    footer.innerHTML = `
    <div class="bfw-footer-left">
      ${buildFooterLeftHtml(initialInfo)}
    </div>
    <div class="bfw-footer-right"></div>
  `;

    // Right side: update badge + GitHub link
    const right = footer.querySelector('.bfw-footer-right');
    right.appendChild(createUpdateBadge());
    const ghLink = document.createElement('a');
    ghLink.href = GITHUB_URL;
    ghLink.target = '_blank';
    ghLink.className = 'bfw-footer-link';
    ghLink.title = 'GitHub 仓库';
    ghLink.innerHTML = icons.github;
    right.appendChild(ghLink);

    startVersionWatch(footer);
    return footer;
  }

  // ---------------------------------------------------------------------------
  // Version watch (page compat, unchanged logic)
  // ---------------------------------------------------------------------------

  function startVersionWatch(footer) {
    if (versionObserver) {
      versionObserver.disconnect();
      versionObserver = null;
    }

    const immediate = checkPageVersion();
    if (immediate.pageVersion) {
      updateFooterContent(footer, immediate);
      return;
    }

    let isThrottled = false;
    versionObserver = new MutationObserver(() => {
      if (isThrottled) return;
      isThrottled = true;
      setTimeout(() => { isThrottled = false; }, 200);

      const compatInfo = checkPageVersion();
      if (compatInfo.pageVersion) {
        updateFooterContent(footer, compatInfo);
        if (versionObserver) {
          versionObserver.disconnect();
          versionObserver = null;
        }
      }
    });

    versionObserver.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      if (versionObserver) {
        versionObserver.disconnect();
        versionObserver = null;
      }
    }, 30000);
  }

  /**
   * Create the panel DOM structure (edge-drawer pattern).
   * @returns {HTMLElement}
   */
  function createPanelDOM() {
    const panel = document.createElement('div');
    panel.className = 'bfw-panel';
    panel.innerHTML = `
    <div class="bfw-panel-handle">
      <span class="bfw-handle-text">刷课助手</span>
    </div>
    <div class="bfw-panel-inner">
      <div class="bfw-panel-header">
        <span class="bfw-title">${SCRIPT_NAME}</span>
        <div class="bfw-header-actions">
          <button class="bfw-pin-btn" title="固定面板">${icons.pin}</button>
        </div>
      </div>
      <div class="bfw-panel-body">
        <div class="bfw-status">
          <span class="bfw-status-dot"></span>
          <span class="bfw-status-text">运行中 — 摄像头已替换</span>
        </div>
        <div class="bfw-log" id="bfw-log-area"></div>
        <div class="bfw-actions">
          <button class="bfw-btn bfw-btn-primary" id="bfw-btn-retry">手动重试</button>
          <button class="bfw-btn bfw-btn-ghost" id="bfw-btn-clear">清空日志</button>
        </div>

        <!-- Settings Section -->
        <div class="bfw-settings-section">
          <div class="bfw-settings-header">
            <span class="bfw-settings-title">设置</span>
          </div>

          <div class="bfw-setting-row" data-setting="faceAutoClick">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.userCheck}</span>
              <span class="bfw-setting-label">自动点击验证按钮</span>
              <span class="bfw-setting-desc">自动完成打开摄像头、拍照、对比等步骤</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-face-autoclick" checked />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="videoReplace">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.video}</span>
              <span class="bfw-setting-label">替换摄像头画面</span>
              <span class="bfw-setting-desc">用图片池中的照片替代真实摄像头</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-video-replace" checked />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="autoCompare">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.checkCircle}</span>
              <span class="bfw-setting-label">拍照后自动对比</span>
              <span class="bfw-setting-desc">关闭时拍照后暂停，需手动点击对比</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-auto-compare" checked />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="autoCourse">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.book}</span>
              <span class="bfw-setting-label">自动刷课</span>
              <span class="bfw-setting-desc">自动播放课程视频并监控进度</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-auto-course" />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="disableVisibilityCheck">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.monitor}</span>
              <span class="bfw-setting-label">防切屏检测</span>
              <span class="bfw-setting-desc">阻止网站因切屏或最小化而暂停播放</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-disable-visibility-check" />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Course Progress Section -->
        <div class="bfw-course-section">
          <div class="bfw-course-header">
            <span class="bfw-course-title">课程进度</span>
            <div class="bfw-course-header-right">
              <span class="bfw-course-ch-label" id="bfw-course-ch-label"></span>
              <span class="bfw-course-count" id="bfw-course-count">0/0</span>
            </div>
          </div>
          <div class="bfw-course-current">
            <span class="bfw-course-current-name" id="bfw-course-current-name">等待课程…</span>
            <span class="bfw-course-vid-pct" id="bfw-course-vid-pct"></span>
          </div>
          <div class="bfw-course-chapter" id="bfw-course-current-chapter"></div>
          <div class="bfw-course-bar-group">
            <div class="bfw-course-bar-row">
              <span class="bfw-course-bar-label">章</span>
              <div class="bfw-course-bar-track">
                <div class="bfw-course-bar-fill" id="bfw-course-chbar-fill" style="width: 0%"></div>
              </div>
              <span class="bfw-course-bar-pct" id="bfw-course-chbar-pct"></span>
            </div>
            <div class="bfw-course-bar-row">
              <span class="bfw-course-bar-label">总</span>
              <div class="bfw-course-bar-track">
                <div class="bfw-course-bar-fill bfw-bar-lesson" id="bfw-course-lbar-fill" style="width: 0%"></div>
              </div>
              <span class="bfw-course-bar-pct" id="bfw-course-lbar-pct"></span>
            </div>
          </div>
          <div class="bfw-course-stat" id="bfw-course-stat"></div>
        </div>

        <!-- Progress Stats Section (inserted by createStatsSection) -->
        <div id="bfw-stats-placeholder"></div>

        <!-- Data Management (import/export backup) -->
        <div class="bfw-data-mgmt">
          <button class="bfw-btn bfw-btn-ghost bfw-data-btn" id="bfw-btn-export-data" title="导出全部数据为 ZIP 备份">${icons.download} 导出备份</button>
          <button class="bfw-btn bfw-btn-ghost bfw-data-btn" id="bfw-btn-import-data" title="从 ZIP 备份文件恢复数据">${icons.upload} 导入备份</button>
        </div>

        <!-- Image Pool Section -->
        <div class="bfw-pool-section">
          <div class="bfw-pool-header">
            <span class="bfw-pool-title">图片池</span>
            <div class="bfw-pool-header-right">
              <span class="bfw-pool-count" id="bfw-pool-count">0/50</span>
              <button class="bfw-preview-btn" id="bfw-btn-preview" title="人脸预览与测试">${icons.sparkles}</button>
              <button class="bfw-weight-btn active" id="bfw-btn-weight" title="动态权重: 开 — 根据图片成功率自动调整选中概率">${icons.sliders}</button>
              <button class="bfw-eye-btn active" id="bfw-btn-eye" title="显示原图">${icons.eyeOff}</button>
            </div>
          </div>
          <div class="bfw-pool-drag-zone" id="bfw-pool-drop-zone" title="拖拽或点击此处上传图片">
            拖拽或点击此处上传图片
            <input type="file" id="bfw-pool-file-input" accept="image/jpeg,image/png,image/webp,image/bmp" multiple hidden />
          </div>
          <div class="bfw-pool-thumbs blur" id="bfw-pool-thumbs">
            <div class="bfw-pool-empty" id="bfw-pool-empty">暂无图片 — 点击上方上传</div>
          </div>
          <div class="bfw-pool-status" id="bfw-pool-status"></div>
          <div class="bfw-pool-actions">
            <button class="bfw-btn bfw-btn-primary" id="bfw-btn-upload">上传</button>
            <button class="bfw-btn bfw-btn-capture" id="bfw-btn-capture" title="捕获当前视频帧到图片池">${icons.film} 捕获</button>
            <button class="bfw-btn bfw-btn-danger" id="bfw-btn-clear-pool" disabled>清空全部</button>
          </div>
        </div>
      </div>
    </div>
  `;

    // Append footer to panel-inner (after panel-body)
    const panelInner = panel.querySelector('.bfw-panel-inner');
    if (panelInner) {
      panelInner.appendChild(createFooter());
    }

    return panel;
  }

  /**
   * Inject CSS styles into the page if not already present.
   */
  function injectStyles() {
    if (document.getElementById('bfw-styles')) return;

    const style = document.createElement('style');
    style.id = 'bfw-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  /**
   * Append a timestamped log message to the panel log area.
   * @param {string} message - The log message text
   */
  function appendLog(message) {
    if (!panelEl) return;
    const logArea = panelEl.querySelector('#bfw-log-area');
    if (!logArea) return;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const line = document.createElement('div');
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${time}]`;
    line.appendChild(timeSpan);
    line.appendChild(document.createTextNode(message));
    logArea.appendChild(line);
    logArea.scrollTop = logArea.scrollHeight;
  }

  /**
   * Update the status indicator in the panel.
   * @param {boolean} active - Whether the interceptor is active
   * @param {string} [text] - Override status text
   */
  function setStatus(active, text) {
    if (!panelEl) return;
    const dot = panelEl.querySelector('.bfw-status-dot');
    const label = panelEl.querySelector('.bfw-status-text');
    if (dot) dot.classList.toggle('inactive', !active);
    if (label) label.textContent = text || (active ? '运行中 — 摄像头已替换' : '已停止');
  }

  /**
   * Build and mount the panel UI into the page.
   * @returns {HTMLElement} The panel root element
   */
  function buildUI() {
    if (panelEl) return panelEl;

    injectStyles();
    panelEl = createPanelDOM();
    document.body.appendChild(panelEl);

    // Bind interaction events
    bindDrawer(panelEl);
    bindActions(panelEl);
    bindPoolEvents(panelEl);
    bindSettings(panelEl);
    bindImportExport(panelEl);

    // Note: bfw:retry bubbles to document where processor.js handles it
    // (the processor logs "已触发手动重试" and performs the actual retry scan)

    // Insert stats section into placeholder
    const statsPlaceholder = panelEl.querySelector('#bfw-stats-placeholder');
    if (statsPlaceholder) {
      const statsSection = createStatsSection();
      statsPlaceholder.parentNode.replaceChild(statsSection, statsPlaceholder);

      // Bind stats events
      bindStatsEvents(panelEl,
        clearAllProgress,
      );

      // Initial stats refresh
      refreshStats(panelEl);
    }

    // Initial pool UI refresh
    refreshPoolUI(panelEl);

    return panelEl;
  }

  // ===========================================================================
  // Import / Export modal — backup & restore ZIP dialog
  // ===========================================================================

  /**
   * Build progress-bar weight entries for the selected sections.
   *
   * Each enabled section is assigned a relative weight used to compute
   * per-section percentage ranges within the overall 0-100% progress bar.
   *
   * @param {{ settings: boolean, progress: boolean, imagePool: boolean }} sections
   * @returns {{ key: string, w: number, range: [number, number] }[]}
   */
  function buildIEModalWeights(sections) {
    const weights = [];
    if (sections.settings) weights.push({ key: 'settings', w: 1, range: [0, 0] });
    if (sections.progress) weights.push({ key: 'progress', w: 1, range: [0, 0] });
    if (sections.imagePool) weights.push({ key: 'imagePool', w: 3, range: [0, 0] });

    // Compute per-section percentage ranges
    const totalW = weights.reduce((s, o) => s + o.w, 0);
    let acc = 0;
    for (const o of weights) {
      o.range = [acc / totalW * 100, (acc + o.w) / totalW * 100];
      acc += o.w;
    }
    return weights;
  }

  /** Currently active import/export modal (null when none open). */
  let _ieModal = null;
  /** JSZip reference retained after parseBackupFile for executeImport. */
  let _ieZipRef = null;

  /**
   * Close and destroy the active import/export modal.
   */
  function closeIEModal() {
    if (_ieModal) {
      if (_ieModal.parentNode) _ieModal.parentNode.removeChild(_ieModal);
      _ieModal = null;
      _ieZipRef = null;
    }
  }

  /**
   * Show the export modal.  Builds the DOM, attaches event handlers, and
   * manages the progress bar / file download flow.
   */
  function showExportModal() {
    closeIEModal();

    const overlay = document.createElement('div');
    overlay.className = 'bfw-ie-overlay';
    _ieModal = overlay;

    estimateExportSize({ settings: true, progress: true, imagePool: true });

    overlay.innerHTML = `
    <div class="bfw-ie-modal">
      <div class="bfw-ie-header">
        <span class="bfw-ie-title">${icons.package} 导出备份</span>
        <button class="bfw-ie-close" id="bfw-ie-close" title="关闭">${icons.x}</button>
      </div>
      <div class="bfw-ie-body" id="bfw-ie-body">
        <div class="bfw-ie-section" data-section="settings">
          <input type="checkbox" class="bfw-ie-section-check" id="bfw-ie-chk-settings" checked />
          <span class="bfw-ie-section-icon">${icons.settings}</span>
          <div class="bfw-ie-section-info">
            <div class="bfw-ie-section-name">设置</div>
            <div class="bfw-ie-section-detail">6 项配置</div>
          </div>
          <span class="bfw-ie-section-size">~0.2 KB</span>
        </div>
        <div class="bfw-ie-section" data-section="progress">
          <input type="checkbox" class="bfw-ie-section-check" id="bfw-ie-chk-progress" checked />
          <span class="bfw-ie-section-icon">${icons.database}</span>
          <div class="bfw-ie-section-info">
            <div class="bfw-ie-section-name">学习进度</div>
            <div class="bfw-ie-section-detail" id="bfw-ie-progress-detail">会话记录与课程统计</div>
          </div>
          <span class="bfw-ie-section-size" id="bfw-ie-progress-size">~0 KB</span>
        </div>
        <div class="bfw-ie-section" data-section="imagePool">
          <input type="checkbox" class="bfw-ie-section-check" id="bfw-ie-chk-images" checked />
          <span class="bfw-ie-section-icon">${icons.archive}</span>
          <div class="bfw-ie-section-info">
            <div class="bfw-ie-section-name">图片池</div>
            <div class="bfw-ie-section-detail" id="bfw-ie-images-detail">已存储的验证图片</div>
          </div>
          <span class="bfw-ie-section-size" id="bfw-ie-images-size">~0 MB</span>
        </div>
        <div class="bfw-ie-estimate" id="bfw-ie-estimate">
          预计文件大小: <strong id="bfw-ie-estimate-value">--</strong>
        </div>
        <div class="bfw-ie-progress" id="bfw-ie-progress">
          <div class="bfw-ie-progress-bar">
            <div class="bfw-ie-progress-fill" id="bfw-ie-progress-fill"></div>
          </div>
          <div class="bfw-ie-progress-text" id="bfw-ie-progress-text">准备...</div>
        </div>
      </div>
      <div class="bfw-ie-footer">
        <button class="bfw-ie-btn bfw-ie-btn-cancel" id="bfw-ie-btn-cancel">取消</button>
        <button class="bfw-ie-btn bfw-ie-btn-primary" id="bfw-ie-btn-primary" disabled>导出</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    // ---- DOM refs ----
    const btnPrimary = overlay.querySelector('#bfw-ie-btn-primary');
    const btnCancel = overlay.querySelector('#bfw-ie-btn-cancel');
    const btnClose = overlay.querySelector('#bfw-ie-close');
    const progressEl = overlay.querySelector('#bfw-ie-progress');
    const progressFill = overlay.querySelector('#bfw-ie-progress-fill');
    const progressText = overlay.querySelector('#bfw-ie-progress-text');
    const estimateEl = overlay.querySelector('#bfw-ie-estimate');
    const estimateVal = overlay.querySelector('#bfw-ie-estimate-value');
    const chkSettings = overlay.querySelector('#bfw-ie-chk-settings');
    const chkProgress = overlay.querySelector('#bfw-ie-chk-progress');
    const chkImages = overlay.querySelector('#bfw-ie-chk-images');
    overlay.querySelector('#bfw-ie-progress-detail');
    overlay.querySelector('#bfw-ie-images-detail');
    const sizeProgress = overlay.querySelector('#bfw-ie-progress-size');
    const sizeImages = overlay.querySelector('#bfw-ie-images-size');
    const sectionsDiv = overlay.querySelectorAll('.bfw-ie-section');

    // ---- Populate initial estimates ----
    function refreshEstimates() {
      const s = chkSettings.checked;
      const p = chkProgress.checked;
      const im = chkImages.checked;
      btnPrimary.disabled = !(s || p || im);

      const est = estimateExportSize({ settings: s, progress: p, imagePool: im });
      if (s) sizeProgress.textContent = formatSize(est.progress);
      else sizeProgress.textContent = '--';
      if (im) sizeImages.textContent = formatSize(est.imagePool);
      else sizeImages.textContent = '--';
      estimateVal.textContent = formatSize(est.total);
    }

    // Clicking section label toggles the checkbox
    sectionsDiv.forEach(sec => {
      sec.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return; // let checkbox handle itself
        const cb = sec.querySelector('input[type="checkbox"]');
        if (cb) {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      });
    });

    chkSettings.addEventListener('change', refreshEstimates);
    chkProgress.addEventListener('change', refreshEstimates);
    chkImages.addEventListener('change', refreshEstimates);
    refreshEstimates();

    // ---- Close handlers ----
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    function close() {
      document.removeEventListener('keydown', onEsc);
      closeIEModal();
    }
    btnCancel.addEventListener('click', close);
    btnClose.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', onEsc);

    // ---- Export action ----
    btnPrimary.addEventListener('click', async () => {
      const sections = {
        settings: chkSettings.checked,
        progress: chkProgress.checked,
        imagePool: chkImages.checked,
      };
      if (!sections.settings && !sections.progress && !sections.imagePool) return;

      // Disable controls during export
      btnPrimary.disabled = true;
      btnPrimary.textContent = '正在导出...';
      btnCancel.disabled = true;
      chkSettings.disabled = true;
      chkProgress.disabled = true;
      chkImages.disabled = true;
      estimateEl.style.display = 'none';
      progressEl.classList.add('active');

      // Track per-section progress
      const weights = buildIEModalWeights(sections);

      try {
        const blob = await buildBackupBlob(sections, (phase, pct, detail) => {
          // Map phase pct to overall pct
          const w = weights.find(o => o.key === phase);
          let overall = 0;
          if (w) {
            overall = w.range[0] + (pct / 100) * (w.range[1] - w.range[0]);
          } else if (phase === 'done') {
            overall = pct; // 0-100 from JSZip
          }
          progressFill.style.width = `${Math.round(overall)}%`;
          if (detail) progressText.textContent = detail;
        });

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
        const time = `${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}`;
        a.download = `bfw-backup-${date}-${time}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        progressText.textContent = '导出完成！';
        // Auto-close after brief delay
        setTimeout(close, 1500);
      } catch (e) {
        progressText.textContent = `导出失败: ${e.message}`;
        progressText.style.color = '#f38ba8';
        // Re-enable controls so user can adjust and retry
        btnPrimary.disabled = false;
        btnPrimary.textContent = '导出';
        btnCancel.disabled = false;
        btnCancel.textContent = '取消';
        chkSettings.disabled = false;
        chkProgress.disabled = false;
        chkImages.disabled = false;
        estimateEl.style.display = '';
        progressEl.classList.remove('active');
      }
    });
  }

  /**
   * Show the import modal.  The flow is two-step:
   *   1. File selection → parse → preview with section checkboxes + strategies
   *   2. Confirm → execute import with progress bar
   *
   * @param {HTMLElement} panel
   */
  function showImportModal(panel) {
    closeIEModal();

    const overlay = document.createElement('div');
    overlay.className = 'bfw-ie-overlay';
    _ieModal = overlay;

    // Step 1: File picker view
    overlay.innerHTML = `
    <div class="bfw-ie-modal">
      <div class="bfw-ie-header">
        <span class="bfw-ie-title">${icons.folderOpen} 导入备份</span>
        <button class="bfw-ie-close" id="bfw-ie-close" title="关闭">${icons.x}</button>
      </div>
      <div class="bfw-ie-body" id="bfw-ie-body">
        <!-- File selection area (click or drag) -->
        <div class="bfw-ie-section bfw-ie-file-pick" id="bfw-ie-file-pick">
          <span style="color:#89b4fa;pointer-events:none;">${icons.upload}</span>
          <span style="font-size:13px;font-weight:600;color:#cdd6f4;pointer-events:none;">点击选择备份文件 或拖拽 .zip 到这里</span>
          <span style="font-size:11px;color:#585b70;pointer-events:none;">支持 .zip 格式</span>
          <input type="file" id="bfw-ie-file-input" accept=".zip,application/zip" hidden />
        </div>
        <!-- Preview area (hidden initially) -->
        <div id="bfw-ie-preview" style="display:none;">
          <div class="bfw-ie-summary" id="bfw-ie-summary"></div>
          <div id="bfw-ie-sections"></div>
        </div>
        <div class="bfw-ie-errors" id="bfw-ie-errors">
          <div class="bfw-ie-errors-title">${icons.alertTriangle} 导入问题</div>
          <div id="bfw-ie-errors-list"></div>
        </div>
        <div class="bfw-ie-progress" id="bfw-ie-progress">
          <div class="bfw-ie-progress-bar">
            <div class="bfw-ie-progress-fill" id="bfw-ie-progress-fill"></div>
          </div>
          <div class="bfw-ie-progress-text" id="bfw-ie-progress-text">准备...</div>
        </div>
        <div class="bfw-ie-result" id="bfw-ie-result"></div>
      </div>
      <div class="bfw-ie-footer">
        <button class="bfw-ie-btn bfw-ie-btn-cancel" id="bfw-ie-btn-cancel">取消</button>
        <button class="bfw-ie-btn bfw-ie-btn-primary" id="bfw-ie-btn-primary" disabled>选择文件后继续</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    // ---- DOM refs ----
    const btnPrimary = overlay.querySelector('#bfw-ie-btn-primary');
    const btnCancel = overlay.querySelector('#bfw-ie-btn-cancel');
    const btnClose = overlay.querySelector('#bfw-ie-close');
    const filePick = overlay.querySelector('#bfw-ie-file-pick');
    const fileInput = overlay.querySelector('#bfw-ie-file-input');
    const previewEl = overlay.querySelector('#bfw-ie-preview');
    const summaryEl = overlay.querySelector('#bfw-ie-summary');
    const sectionsEl = overlay.querySelector('#bfw-ie-sections');
    const errorsEl = overlay.querySelector('#bfw-ie-errors');
    const errorsList = overlay.querySelector('#bfw-ie-errors-list');
    const progressEl = overlay.querySelector('#bfw-ie-progress');
    const progressFill = overlay.querySelector('#bfw-ie-progress-fill');
    const progressText = overlay.querySelector('#bfw-ie-progress-text');
    const resultEl = overlay.querySelector('#bfw-ie-result');

    /** Current strategy selections: 'replace' | 'merge' */
    let strategies = { settings: 'replace', progress: 'merge', imagePool: 'merge' };
    /** Selected sections for import */
    let importSections = { settings: true, progress: true, imagePool: true };

    // ---- Close handlers ----
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    function close() {
      document.removeEventListener('keydown', onEsc);
      closeIEModal();
    }
    btnCancel.addEventListener('click', close);
    btnClose.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', onEsc);

    // ---- File picker (click + drag-drop) ----
    filePick.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      await handlePickedFile(file);
    });

    // Drag-and-drop handlers
    filePick.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      filePick.classList.add('dragover');
    });
    filePick.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      filePick.classList.remove('dragover');
    });
    filePick.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      filePick.classList.remove('dragover');
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      // Sync to hidden input so the file is accessible via the same reference
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      handlePickedFile(file);
    });

    /**
     * Parse the picked/ dropped file and populate the preview area.
     * Extracted so both click-pick and drag-drop can share the same logic.
     * @param {File} file
     */
    async function handlePickedFile(file) {
      errorsList.innerHTML = '';
      errorsEl.classList.remove('visible');
      progressEl.classList.remove('active');
      resultEl.classList.remove('visible');
      resultEl.innerHTML = '';
      btnPrimary.disabled = true;
      btnPrimary.textContent = '正在解析...';

      const result = await parseBackupFile(file);
      _ieZipRef = result.zip;
      result.manifest;

      if (!result.valid || result.errors.length > 0) {
        errorsEl.classList.add('visible');
        errorsList.innerHTML = result.errors.map(e => `<div>• ${escapeHtml(e)}</div>`).join('');
        btnPrimary.textContent = '文件无效';
        btnPrimary.disabled = true;
        return;
      }

      // Build preview
      const manifest = result.manifest;
      const summaryLines = buildSummary(manifest);

      summaryEl.innerHTML = `
      <div class="bfw-ie-summary-header">
        ${icons.fileText} 备份文件信息
      </div>
      ${summaryLines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
    `;

      // Build section checkboxes with strategy selectors
      const availableSections = manifest.sections || {};
      let sectionsHTML = '';

      const sectionDefs = [
        { key: 'settings', icon: icons.settings, name: '设置', detail: (availableSections.settings ? `${availableSections.settings.count || '?'} 项` : '无数据'), hasMerge: false },
        { key: 'progress', icon: icons.database, name: '学习进度', detail: (availableSections.progress ? `${availableSections.progress.sessions || 0} 次学习, ${availableSections.progress.courses || 0} 门课程` : '无数据'), hasMerge: true },
        { key: 'imagePool', icon: icons.archive, name: '图片池', detail: (availableSections.imagePool ? `${availableSections.imagePool.count || 0} 张图片` : '无数据'), hasMerge: true },
      ];

      for (const def of sectionDefs) {
        const hasData = !!availableSections[def.key];
        const strategyHTML = def.hasMerge ? `
        <div class="bfw-ie-section-strategy">
          <button class="bfw-ie-strategy-btn ${strategies[def.key] === 'replace' ? 'active' : ''}" data-section="${def.key}" data-strategy="replace">替换</button>
          <button class="bfw-ie-strategy-btn ${strategies[def.key] === 'merge' ? 'active' : ''}" data-section="${def.key}" data-strategy="merge">合并</button>
        </div>
      ` : '';

        sectionsHTML += `
        <div class="bfw-ie-section ${hasData ? '' : 'disabled'}" data-section="${def.key}">
          <input type="checkbox" class="bfw-ie-section-check" id="bfw-ie-chk-${def.key}"
            ${hasData ? 'checked' : ''} ${hasData ? '' : 'disabled'} />
          <span class="bfw-ie-section-icon">${def.icon}</span>
          <div class="bfw-ie-section-info">
            <div class="bfw-ie-section-name">${def.name}</div>
            <div class="bfw-ie-section-detail">${escapeHtml(def.detail)}</div>
          </div>
          ${strategyHTML}
        </div>
      `;
      }

      sectionsEl.innerHTML = sectionsHTML;
      previewEl.style.display = '';

      // Bind section checkbox changes
      sectionsEl.querySelectorAll('.bfw-ie-section-check').forEach(cb => {
        cb.addEventListener('change', () => {
          importSections[cb.id.replace('bfw-ie-chk-', '')] = cb.checked;
        });
      });

      // Bind strategy button changes
      sectionsEl.querySelectorAll('.bfw-ie-strategy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const section = btn.dataset.section;
          const strategy = btn.dataset.strategy;
          strategies[section] = strategy;
          // Update active states
          sectionsEl.querySelectorAll(`.bfw-ie-strategy-btn[data-section="${section}"]`).forEach(b => {
            b.classList.toggle('active', b.dataset.strategy === strategy);
          });
        });
      });

      // Enable primary button
      btnPrimary.textContent = '执行导入';
      btnPrimary.disabled = false;
    }

    // ---- Import execution ----
    btnPrimary.addEventListener('click', async () => {
      if (!_ieZipRef) return;

      // Collect selected sections
      const sections = {};
      for (const key of ['settings', 'progress', 'imagePool']) {
        const cb = overlay.querySelector(`#bfw-ie-chk-${key}`);
        sections[key] = cb ? cb.checked : false;
      }

      const hasAny = sections.settings || sections.progress || sections.imagePool;
      if (!hasAny) return;

      // Disable controls
      btnPrimary.disabled = true;
      btnPrimary.textContent = '正在导入...';
      btnCancel.disabled = true;
      filePick.style.display = 'none';
      previewEl.style.opacity = '0.5';
      previewEl.style.pointerEvents = 'none';
      progressEl.classList.add('active');

      // Section weights
      const weights = buildIEModalWeights(sections);

      try {
        const results = await executeImport(_ieZipRef, sections, strategies, (phase, pct, detail) => {
          const w = weights.find(o => o.key === phase);
          let overall = 0;
          if (w) {
            overall = w.range[0] + (pct / 100) * (w.range[1] - w.range[0]);
          }
          progressFill.style.width = `${Math.round(overall)}%`;
          if (detail) progressText.textContent = detail;
        });

        progressText.textContent = '导入完成！';

        // Show result summary
        const items = [];
        if (results.settings) {
          items.push(`<div class="bfw-ie-result-item success">${icons.checkCircle} 设置: 已导入 ${results.settings.imported} 项</div>`);
        }
        if (results.progress) {
          items.push(`<div class="bfw-ie-result-item success">${icons.checkCircle} 学习进度: ${results.progress.sessions} 次学习, ${results.progress.courses} 门课程</div>`);
        }
        if (results.imagePool) {
          const r = results.imagePool;
          const icon = r.skipped > 0 ? (r.added > 0 ? icons.alertTriangle : icons.x) : icons.checkCircle;
          const cls = r.skipped > 0 ? (r.added > 0 ? 'warn' : 'error') : 'success';
          items.push(`<div class="bfw-ie-result-item ${cls}">${icon} 图片池: 已导入 ${r.added} 张${r.skipped > 0 ? `, 跳过 ${r.skipped} 张` : ''}</div>`);
        }

        resultEl.innerHTML = items.join('');
        resultEl.classList.add('visible');

        // Refresh panel UI
        const target = panel || panelEl;
        if (target) {
          refreshPoolUI(target);
          refreshStats(target);
        }

        btnPrimary.textContent = '导入完成';
        btnPrimary.disabled = true;
        btnCancel.textContent = '关闭';
        btnCancel.disabled = false;
      } catch (e) {
        progressText.textContent = `导入失败: ${e.message}`;
        progressText.style.color = '#f38ba8';
        btnPrimary.textContent = '导入失败';
        btnPrimary.disabled = true;
        btnCancel.textContent = '关闭';
        btnCancel.disabled = false;
      }
    });
  }

  /**
   * @file Video stream interceptor — replaces the camera feed with a pool image.
   *
   * Monkey-patches navigator.mediaDevices.getUserMedia so that when the page
   * requests camera access, we return a canvas.captureStream() that draws a
   * mutated pool image instead of the real camera feed.
   *
   * This makes the fake face visible in the <video> preview and ensures every
   * frame the website captures (via canvas, video snapshot, etc.) contains the
   * fake face — not just the intercepted network request body.
   */


  /** Reference to the original getUserMedia (cached at install time). */
  let originalGetUserMedia = null;

  /** Whether the interceptor has been installed. */
  let installed$1 = false;

  // ---------------------------------------------------------------------------
  // Active stream state — cleaned up when tracks end
  // ---------------------------------------------------------------------------

  /**
   * @typedef {Object} FakeStreamState
   * @property {HTMLCanvasElement} canvas   - offscreen canvas drawing the fake face
   * @property {CanvasRenderingContext2D} ctx
   * @property {HTMLImageElement} image     - current pool image drawn on the canvas
   * @property {number} drawIntervalId      - setInterval handle for the draw loop (15 fps)
   * @property {number} width               - canvas width
   * @property {number} height              - canvas height
   */

  /** Map of MediaStream → FakeStreamState for cleanup. */
  const activeStreams = new WeakMap();

  /** Set of active fake MediaStreams (enables iteration — WeakMap keys are not enumerable). */
  const activeStreamSet = new Set();

  /** Map of MediaStream → original getUserMedia constraints (for real/fake toggle). */
  const streamConstraints = new WeakMap();

  /** How many fake MediaStream tracks are currently live (counter avoids WeakMap race). */
  let _activeStreamCount = 0;

  /** Whether at least one fake video stream is currently active. */
  let _fakeStreamActive = false;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Parse video dimensions from getUserMedia constraints.
   * Returns { width, height } — falls back to DEFAULT_WIDTH/HEIGHT.
   *
   * @param {MediaStreamConstraints} constraints
   * @returns {{ width: number, height: number }}
   */
  function parseVideoDimensions(constraints) {
    const cfg = VIDEO_REPLACE_CONFIG;
    let width = cfg.DEFAULT_WIDTH;
    let height = cfg.DEFAULT_HEIGHT;

    try {
      const video = constraints?.video;
      if (!video) return { width, height };

      // Handle boolean true → use defaults
      if (video === true) return { width, height };

      // Handle object constraints
      if (typeof video === 'object') {
        // width can be a number or { ideal: N, ... }
        const w = video.width;
        const h = video.height;

        if (typeof w === 'number') {
          width = w;
        } else if (w && typeof w === 'object') {
          if (typeof w.ideal === 'number') width = w.ideal;
          else if (typeof w.exact === 'number') width = w.exact;
          else if (typeof w.min === 'number') width = w.min;
        }

        if (typeof h === 'number') {
          height = h;
        } else if (h && typeof h === 'object') {
          if (typeof h.ideal === 'number') height = h.ideal;
          else if (typeof h.exact === 'number') height = h.exact;
          else if (typeof h.min === 'number') height = h.min;
        }
      }

      // Also handle deviceId / facingMode constraints that may have embedded dimensions
      if (typeof video === 'object' && video.mandatory) {
        const mandatory = video.mandatory;
        if (mandatory.minWidth) width = Math.max(width, mandatory.minWidth);
        if (mandatory.minHeight) height = Math.max(height, mandatory.minHeight);
      }
    } catch (e) {
      debug('Video interceptor: failed to parse dimensions from constraints, using defaults');
    }

    return { width: Math.max(width, 160), height: Math.max(height, 120) };
  }

  /**
   * Load a data URI into an HTMLImageElement.
   * @param {string} dataUrl
   * @returns {Promise<HTMLImageElement>}
   */
  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load pool image'));
      img.src = dataUrl;
    });
  }

  /** Cached AudioContext for silent audio track generation.
   *  Creating a new context per call leaks system audio resources;
   *  browsers may cap active AudioContext instances (~6 in Chrome).
   *  A single context with a continuous silent oscillator serves every
   *  fake stream. */
  let _cachedAudioCtx = null;

  /**
   * Create a silent audio track using the Web Audio API.
   * Reuses a single AudioContext across all calls to avoid resource leaks.
   * @returns {MediaStreamTrack|null}
   */
  function createSilentAudioTrack() {
    try {
      if (!_cachedAudioCtx) {
        _cachedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      // Resume if suspended (browsers may suspend inactive contexts)
      if (_cachedAudioCtx.state === 'suspended') {
        _cachedAudioCtx.resume();
      }
      const oscillator = _cachedAudioCtx.createOscillator();
      const gain = _cachedAudioCtx.createGain();
      const dest = _cachedAudioCtx.createMediaStreamDestination();

      // Zero gain = silent
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(dest);
      oscillator.start();

      const tracks = dest.stream.getAudioTracks();
      if (tracks.length > 0) {
        debug('Video interceptor: created silent audio track');
        return tracks[0];
      }
      return null;
    } catch (e) {
      debug('Video interceptor: could not create silent audio track:', e);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Draw loop — keeps the canvas stream "alive" with subtle jitter
  // ---------------------------------------------------------------------------

  /** Draw refresh rate for static images (fps). 15 fps is enough for
   *  the brightness jitter to look "alive" while saving ~75% CPU vs 60 fps. */
  const DRAW_FPS = 15;
  const DRAW_INTERVAL_MS = Math.round(1000 / DRAW_FPS);

  /**
   * Start the draw loop for a fake stream state.
   * Each frame redraws the image with a subtle brightness jitter to simulate
   * a live camera feed (minor exposure variations).
   *
   * Uses setInterval at a fixed low rate — the canvas is static apart from
   * the jitter, so 60 fps rAF is unnecessary overhead.
   *
   * @param {FakeStreamState} state
   */
  function startDrawLoop(state) {
    const cfg = VIDEO_REPLACE_CONFIG;

    function draw() {
      if (!state.image) return;

      const { ctx, canvas, image } = state;

      // Subtle brightness jitter (±BRIGHTNESS_JITTER)
      const jitter = 1 + (Math.random() - 0.5) * 2 * cfg.BRIGHTNESS_JITTER;
      ctx.filter = `brightness(${jitter.toFixed(3)})`;

      // Cover-mode scaling: fill the entire canvas
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const drawW = image.naturalWidth * scale;
      const drawH = image.naturalHeight * scale;
      const dx = (canvas.width - drawW) / 2;
      const dy = (canvas.height - drawH) / 2;

      // Clear and redraw
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, dx, dy, drawW, drawH);

      // Reset filter
      ctx.filter = 'none';
    }

    // Draw first frame immediately, then every DRAW_INTERVAL_MS
    draw();
    state.drawIntervalId = setInterval(draw, DRAW_INTERVAL_MS);
  }

  /**
   * Clean up a fake stream's resources.
   * @param {FakeStreamState} state
   */
  function cleanupState(state) {
    if (state.drawIntervalId) {
      clearInterval(state.drawIntervalId);
      state.drawIntervalId = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Core: create fake stream from pool image
  // ---------------------------------------------------------------------------

  /**
   * Create a fake MediaStream that renders a pool image instead of the real camera.
   *
   * @param {MediaStreamConstraints} constraints - Original getUserMedia constraints
   * @param {Function} originalFn - The original getUserMedia function
   * @returns {Promise<MediaStream>}
   */
  async function createFakeStream(constraints, originalFn) {
    const cfg = VIDEO_REPLACE_CONFIG;
    const { width, height } = parseVideoDimensions(constraints);

    // Pick an image from the pool
    let dataUrl;
    try {
      await initPool();
      dataUrl = await pickImage();
    } catch (e) {
      warn('Video interceptor: cannot create fake stream —', e?.message || e);
      if (e?.code === 'POOL_EMPTY') {
        appendLog('图片池为空 — 使用真实摄像头');
        setStatus(true, '运行中 — 图片池为空 (真实摄像头)');
      }
      // Fall back to real camera
      return originalFn.call(navigator.mediaDevices, constraints);
    }

    // Load the image
    const image = await loadImage(dataUrl);

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Initial draw
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, dx, dy, drawW, drawH);

    // Start draw loop (for jitter animation)
    const state = { canvas, ctx, image, drawIntervalId: 0, width, height };
    startDrawLoop(state);

    // Capture stream from canvas.
    // Try with frameRate first (supported in Chrome, Edge, Safari); fall back
    // to parameterless captureStream() for browsers that ignore or reject the
    // argument (older Firefox).  Only fall back to the real camera if both fail.
    let stream;
    try {
      stream = canvas.captureStream(cfg.STREAM_FPS);
    } catch (_e1) {
      debug('Video interceptor: canvas.captureStream(fps) threw, trying without frameRate');
      try {
        stream = canvas.captureStream();
      } catch (_e2) {
        warn('Video interceptor: canvas.captureStream() failed:', _e2);
        cleanupState(state);
        return originalFn.call(navigator.mediaDevices, constraints);
      }
    }

    // Add silent audio track if audio was requested
    if (constraints?.audio) {
      const audioTrack = createSilentAudioTrack();
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
    }

    // Clean up when the stream ends
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].addEventListener('ended', () => {
        debug('Video interceptor: fake stream track ended, cleaning up');
        cleanupState(state);
        activeStreams.delete(stream);
        activeStreamSet.delete(stream);
        streamConstraints.delete(stream);
        _activeStreamCount = Math.max(0, _activeStreamCount - 1);
        if (_activeStreamCount === 0) {
          _fakeStreamActive = false;
          debug('Video interceptor: no more active fake streams, clearing flag');
        }
      });
    }

    activeStreams.set(stream, state);
    activeStreamSet.add(stream);
    streamConstraints.set(stream, constraints);
    _activeStreamCount++;
    _fakeStreamActive = true;
    info(`Video interceptor: fake stream created (${width}×${height})`);
    appendLog(`摄像头流已替换 (${width}×${height})`);
    setStatus(true, '运行中 — 摄像头已替换');

    return stream;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Install the video stream interceptor by monkey-patching
   * navigator.mediaDevices.getUserMedia.
   *
   * When the page requests camera access, the interceptor returns a canvas-based
   * fake stream instead of the real camera feed.
   */
  function installVideoInterceptor() {
    if (installed$1) {
      warn('Video interceptor already installed');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      debug('Video interceptor: getUserMedia not available, skipping');
      return;
    }

    originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async function interceptedGetUserMedia(constraints) {
      // Check settings — skip interception if video replacement is disabled
      if (!getSetting('videoReplace', true)) {
        debug('Video interceptor: disabled — passing through to real camera');
        return originalGetUserMedia(constraints);
      }

      // Only intercept video requests
      if (!constraints || !constraints.video) {
        debug('Video interceptor: no video in constraints — passing through');
        return originalGetUserMedia(constraints);
      }

      debug('Video interceptor: intercepting getUserMedia with video constraints');

      try {
        const stream = await createFakeStream(constraints, originalGetUserMedia);
        return stream;
      } catch (e) {
        warn('Video interceptor: fake stream failed, falling back to real camera:', e);
        appendLog('摄像头替换失败 — 使用真实摄像头');
        setStatus(true, '运行中 — 摄像头替换失败 (使用真实摄像头)');
        return originalGetUserMedia(constraints);
      }
    };

    installed$1 = true;
    info('Video interceptor installed (getUserMedia monkey-patch)');
  }

  /**
   * Check whether a MediaStream was created by the interceptor (i.e. is a fake stream).
   * @param {MediaStream} stream
   * @returns {boolean}
   */
  function isStreamFake(stream) {
    return activeStreams.has(stream);
  }

  /**
   * Get the original getUserMedia constraints for a stream.
   * Returns null if the stream is not a known fake stream or the constraints
   * are not available.
   * @param {MediaStream} stream
   * @returns {MediaStreamConstraints|null}
   */
  function getStreamConstraints(stream) {
    return streamConstraints.get(stream) ?? null;
  }

  /**
   * Pick a new pool image and swap it into the canvas for the given stream.
   * Triggers an immediate redraw on the next animation frame.
   *
   * @param {MediaStream} stream - The fake MediaStream returned by getUserMedia
   * @returns {Promise<boolean>} true if the image was swapped, false if stream not found
   */
  async function refreshStreamImage(stream) {
    const state = activeStreams.get(stream);
    if (!state) return false;

    try {
      await initPool();
      const dataUrl = await pickImage();
      const newImage = await loadImage(dataUrl);
      state.image = newImage;
      debug('Video interceptor: manually refreshed pool image');
      return true;
    } catch (e) {
      debug('Video interceptor: manual image refresh failed:', e?.message || e);
      return false;
    }
  }

  /**
   * Switch from a fake stream to the real camera.
   *
   * Acquires the real stream FIRST — if it fails, the fake stream is kept
   * intact so the video element never goes black.
   *
   * @param {MediaStream} fakeStream - The current fake MediaStream
   * @param {MediaStreamConstraints} constraints - Original constraints
   * @returns {Promise<MediaStream>} The real camera MediaStream
   * @throws {Error} If the real camera cannot be accessed
   */
  async function switchToRealCamera(fakeStream, constraints) {
    if (!originalGetUserMedia) {
      throw new Error('Original getUserMedia not available');
    }

    // Acquire the real stream FIRST — if this throws, the fake stream survives
    const realStream = await originalGetUserMedia(constraints);

    // Now that we have the real stream, stop the fake one.
    // The 'ended' listener handles canvas cleanup, WeakMap deletion,
    // active-stream counter decrement, and flag clearing.
    for (const track of fakeStream.getTracks()) {
      track.stop();
    }

    info('Video interceptor: switched to real camera');
    return realStream;
  }

  /**
   * Switch from a real camera stream back to a fake stream.
   * Stops the real stream tracks (if provided) and creates a new fake stream.
   *
   * @param {MediaStream|null} realStream - The current real stream (will be stopped). Pass null if no real stream to stop.
   * @param {MediaStreamConstraints} constraints - Original getUserMedia constraints
   * @returns {Promise<MediaStream>} A new fake MediaStream
   */
  async function switchToFakeCamera(realStream, constraints) {
    // Stop real stream tracks if provided
    if (realStream) {
      for (const track of realStream.getTracks()) {
        track.stop();
      }
    }

    return createFakeStream(constraints, originalGetUserMedia);
  }

  /**
   * Push a specific image data URL onto all currently active fake streams.
   * This replaces the canvas image in-place — the draw loop immediately
   * picks up the new image without tearing down or recreating the stream.
   *
   * Used by the face preview modal to test how a specific mutated image
   * looks on the live video feed.
   *
   * @param {string} dataUrl - JPEG/PNG data URI (ideally 400×300)
   * @returns {Promise<boolean>} true if at least one stream was updated
   */
  async function pushImageToActiveStream(dataUrl) {
    if (!_fakeStreamActive || activeStreamSet.size === 0) {
      debug('Video interceptor: no active fake stream to push image to');
      return false;
    }

    let pushed = false;
    for (const stream of activeStreamSet) {
      const state = activeStreams.get(stream);
      if (!state) continue;

      try {
        const image = await loadImage(dataUrl);
        state.image = image;
        pushed = true;
        debug('Video interceptor: pushed custom image to live stream');
      } catch (e) {
        warn('Video interceptor: failed to push image to stream:', e?.message || e);
      }
    }

    if (pushed) {
      info(`Video interceptor: pushed custom image to ${pushed ? 'live stream' : 'no streams'}`);
      appendLog('预览图片已推送到摄像头');
    }

    return pushed;
  }

  /**
   * @file Shared body-level MutationObserver — one observer, many handlers.
   *
   * Before this module, both processor.js and video-overlay.js created their
   * own MutationObserver on document.body with `{ childList: true, subtree:
   * true }`.  On a page with heavy DOM churn every mutation fired 2–3
   * observer callbacks, each traversing the mutation records independently.
   *
   * This module creates a single observer and dispatches to registered
   * handlers.  Modules call registerBodyMutationHandler(fn) and receive an
   * unsubscribe function.  Handlers that throw are isolated — one handler
   * failing does not prevent others from running.
   *
   * @module utils/dom-observer
   */

  /** @type {MutationObserver|null} */
  let _observer = null;

  /** @type {Array<(mutations: MutationRecord[]) => void>} */
  const _handlers = [];

  /**
   * Register a callback to be invoked on every document.body mutation
   * (childList + subtree).  Returns an unsubscribe function; call it to
   * remove the handler.
   *
   * The observer is created lazily on the first registration and disconnected
   * automatically when all handlers unsubscribe.
   *
   * @param {(mutations: MutationRecord[]) => void} fn
   * @returns {() => void} unsubscribe function
   */
  function registerBodyMutationHandler(fn) {
    _handlers.push(fn);

    if (!_observer) {
      _observer = new MutationObserver((mutations) => {
        for (let i = 0; i < _handlers.length; i++) {
          try { _handlers[i](mutations); } catch (_) { /* isolate failures */ }
        }
      });
      _observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      const idx = _handlers.indexOf(fn);
      if (idx >= 0) _handlers.splice(idx, 1);
      if (_handlers.length === 0 && _observer) {
        _observer.disconnect();
        _observer = null;
      }
    };
  }

  /**
   * @file Auto-processor for face verification windows
   * Observes the page for face recognition UI elements and auto-clicks them
   * in sequence: open camera → take photo → start comparison.
   *
   * Actual DOM structure on tj.100.wang:
   *
   *   State 1 (camera not opened):
   *     <div class="face_btn">
   *       <span class="face_btns btn_fill">开启摄像头</span>
   *     </div>
   *
   *   State 2 (camera opened, ready to take photo):
   *     <div class="face_btn">
   *       <span class="face_btns btn_again">拍照</span>
   *     </div>
   *
   *   State 3 (photo taken, two options):
   *     <div class="face_btn">
   *       <span class="face_btns btn_again">重新拍照</span>
   *       <span class="face_btns btn_contrast btn_fill">开始对比</span>
   *     </div>
   *
   * Note: .btn_again is used for BOTH "拍照" and "重新拍照" — text content
   * must be checked to distinguish the action.  "重试" (retry after failure)
   * may also use .btn_again.
   */


  let observerUnsubscribe$1 = null;
  let retryAttempt = 0;
  let retryExhausted = false;
  let retryBackoffTimer = null;
  let debounceTimer = null;
  let compareRetries = 0;

  /**
   * Consecutive compare-fail counter for the retake→compare loop.
   * Incremented each time a fresh "重新拍照" → "开始对比" cycle is triggered
   * from the comparing state.  Resets when the modal closes (success) or
   * when the processor is stopped/reset.
   */
  let compareAttempts = 0;

  /**
   * Timestamp (Date.now()) of the most recent state transition.
   * Used by the watchdog check in checkAndStartSequence() to detect
   * sequences that have been stuck in the same state too long without
   * making progress.
   */
  let _stateEnteredAt = 0;

  /**
   * Maximum time (ms) a non-idle sequence state may persist before the
   * watchdog forces a reset.  Catches edge cases where the DOM stops
   * updating (slow server, frozen page) and the MutationObserver stays
   * silent — the state machine would otherwise be stuck forever.
   *
   * Must exceed COMPARE_COOLDOWN_MS + COMPARE_RETRY_GAP_MAX_MS + pipeline
   * delays (~35s worst case) so the cooldown and retry-gap mechanisms get
   * a fair chance before the watchdog intervenes.
   */
  const WATCHDOG_TIMEOUT_MS = 40000;

  /**
   * Sentinel that prevents duplicate post-cooldown re-check timers.
   * Set to true when scheduleCooldownRecheck() arms a timer; cleared
   * when the timer fires or when clearSequence() runs.
   */
  let _cooldownRecheckScheduled = false;

  /**
   * Timestamp (Date.now()) of the most recent "开始对比" click.
   * Used by handleCompareFailRecovery to enforce a cooldown period —
   * the server needs time to respond before we can safely conclude that
   * the comparison was rejected.  0 = no compare has been submitted yet.
   */
  let _lastCompareSubmittedAt = 0;

  /**
   * Jittered cooldown duration (ms) for the current compare cycle.
   * Captured once at compare-submit time so the cooldown is stable for
   * the entire server-response window.  Fixed per attempt — server
   * response time doesn't change between retries.
   *
   * Initialised from AUTO_CONFIG at module load — assumes {@link AUTO_CONFIG}
   * is available at this point (imported at the top of the module).
   */
  let _compareCooldownMs = AUTO_CONFIG.COMPARE_COOLDOWN_MS;

  /**
   * Current auto-click sequence state.
   * @type {'idle' | 'waiting_modal' | 'camera_opening' | 'photo_taking' | 'photo_taken' | 'comparing'}
   */
  let sequenceState = 'idle';

  /**
   * Whether a verification attempt is in flight — any state past the initial
   * modal detection where an image from the pool is being used for verification.
   *
   * Set implicitly by the state machine; read when the modal disappears to
   * decide whether to record a success for the last picked image.
   *
   * True for: camera_opening, photo_taking, photo_taken, comparing.
   * False for: idle, waiting_modal.
   */
  function isVerificationInFlight() {
    return sequenceState === 'camera_opening'
        || sequenceState === 'photo_taking'
        || sequenceState === 'photo_taken'
        || sequenceState === 'comparing';
  }

  /**
   * Transition the sequence state machine and record the timestamp.
   * Every state assignment must go through this helper so the watchdog
   * can detect stalled sequences.
   * @param {string} newState
   */
  function transitionState(newState) {
    sequenceState = newState;
    _stateEnteredAt = Date.now();
  }

  /**
   * Schedule a one-shot re-check after the compare cooldown expires.
   *
   * When handleCompareFailRecovery is blocked by the cooldown guard,
   * there may be no further DOM mutations to trigger the observer.
   * This timer ensures we re-evaluate the modal state once the server
   * has had time to respond.
   *
   * Idempotent — only one re-check timer is scheduled at a time.
   *
   * @param {number} elapsed - ms already elapsed since compare was submitted
   */
  function scheduleCooldownRecheck(elapsed) {
    if (_cooldownRecheckScheduled) return;
    _cooldownRecheckScheduled = true;

    const remaining = _compareCooldownMs - elapsed + 150;
    debug(`Scheduling cooldown re-check in ${remaining}ms`);
    const timer = setTimeout(() => {
      _cooldownRecheckScheduled = false;
      checkAndStartSequence();
    }, remaining);
    sequenceTimers.push(timer);
  }

  /**
   * Timer handles for the sequential click delays (used to cancel on reset).
   */
  let sequenceTimers = [];

  // ---------------------------------------------------------------------------
  // Selectors & text patterns
  // ---------------------------------------------------------------------------

  /**
   * CSS selectors for face verification UI elements.
   * These are tried first (fast path); text-content fallback is used when selectors fail.
   */
  const FACE_UI_SELECTORS = {
    /** The face verification modal container (Ant Design modal) */
    MODAL: '.ant-modal-content',
    /** Open camera button — .face_btns.btn_fill without .btn_contrast */
    CAMERA_BTN: '.face_btns.btn_fill:not(.btn_contrast)',
    /** Take photo / re-take photo button — .face_btns.btn_again */
    PHOTO_BTN: '.face_btns.btn_again',
    /** Start comparison button */
    COMPARE_BTN: '.face_btns.btn_contrast.btn_fill'};

  /**
   * Text patterns for button identification (fallback when CSS selectors are ambiguous).
   * .btn_again is used for "拍照", "重新拍照", and possibly "重试" —
   * we distinguish by text content.
   *
   * Exported for use by video-overlay.js and other UI modules that search for
   * face verification buttons.
   */
  const BTN_TEXT = {
    CAMERA: ['开启摄像头', '打开摄像头'],
    PHOTO: ['拍照'],
    RETAKE: ['重新拍照', '重新拍'],
    COMPARE: ['开始对比', '对比', '开始验证'],
    RETRY: ['重试', '重新验证'],
  };

  // ---------------------------------------------------------------------------
  // Button finder — class selector first, text fallback
  // ---------------------------------------------------------------------------

  /**
   * Find a button element using class selectors first, falling back to text-content search.
   *
   * @param {string} selector - CSS selector to try first
   * @param {string[]} [textPatterns] - Text patterns for fallback search
   * @param {HTMLElement} [root=document] - Root element to search within
   * @returns {HTMLElement|null}
   */
  function findButton(selector, textPatterns, root = document) {
    // 1. Class-based selector (fast path)
    const el = root.querySelector(selector);
    if (el) return el;

    // 2. Text-content fallback (slow path)
    if (textPatterns && textPatterns.length > 0) {
      // Search among .face_btns elements first
      const faceBtns = root.querySelectorAll('.face_btns');
      for (const btn of faceBtns) {
        const text = (btn.textContent || '').trim();
        for (const pattern of textPatterns) {
          if (text.includes(pattern)) return btn;
        }
      }
      // Broader: search any button-like element
      // Exclude our own panel buttons to avoid recursive self-clicks
      const candidates = root.querySelectorAll('button, [role="button"], .ant-btn, .ant-btn-primary');
      for (const btn of candidates) {
        if (btn.closest('.bfw-panel')) continue;
        const text = (btn.textContent || '').trim();
        for (const pattern of textPatterns) {
          if (text.includes(pattern)) return btn;
        }
      }
    }

    return null;
  }

  /**
   * Check if a button element's text matches any pattern in the list.
   * @param {Element} btn
   * @param {string[]} patterns
   * @returns {boolean}
   */
  function btnTextMatches(btn, patterns) {
    const text = (btn.textContent || '').trim();
    return patterns.some(p => text.includes(p));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Clear all pending sequence timers and reset state.
   */
  function clearSequence() {
    sequenceTimers.forEach(clearTimeout);
    sequenceTimers = [];
    transitionState('idle');
    compareRetries = 0;
    _lastCompareSubmittedAt = 0;
    _compareCooldownMs = AUTO_CONFIG.COMPARE_COOLDOWN_MS;
    _cooldownRecheckScheduled = false;
  }

  /**
   * Click an element and log the action.
   * @param {Element} el
   * @param {string} label
   * @returns {boolean}
   */
  function clickElement(el, label) {
    if (!el) return false;
    try {
      el.click();
      info(`Auto-clicked: ${label}`);
      appendLog(`已自动点击: ${label}`);
      return true;
    } catch (e) {
      warn(`Auto-click failed for "${label}":`, e);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Retry backoff
  // ---------------------------------------------------------------------------

  /**
   * Calculate the exponential backoff delay for the current retry attempt.
   * @returns {number} milliseconds
   */
  function getBackoffDelay() {
    const delay = AUTO_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, retryAttempt - 1);
    return jitterMs(Math.min(delay, AUTO_CONFIG.RETRY_MAX_DELAY_MS), 0.2);
  }

  /**
   * Calculate the pacing gap after a confirmed compare failure.
   * Grows exponentially: COMPARE_RETRY_GAP_BASE_MS × 2^(compareAttempts-1),
   * capped at COMPARE_RETRY_GAP_MAX_MS.
   *
   * Separate from COMPARE_COOLDOWN_MS — the cooldown only waits for the
   * server to respond; this gap paces retry cycles after failure is confirmed.
   *
   * Uses jitterMsFloor (only lengthens) so the gap never falls below the
   * intended minimum.
   *
   * @returns {number} milliseconds
   */
  function getCompareRetryGapMs() {
    const gap = AUTO_CONFIG.COMPARE_RETRY_GAP_BASE_MS * Math.pow(2, compareAttempts - 1);
    return jitterMsFloor(Math.min(gap, AUTO_CONFIG.COMPARE_RETRY_GAP_MAX_MS), 0.25);
  }

  /**
   * Handle retry exhaustion — give up and stop the auto-processor.
   */
  function exhaustRetries() {
    retryExhausted = true;
    warn(`Retry limit reached (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} attempts). Stopping auto-processor.`);
    appendLog(`自动重试已达上限 (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次)，已停止`);
    setStatus(false, '已停止 — 重试次数已达上限');
    stopAutoProcessor();
  }

  // ---------------------------------------------------------------------------
  // Sequential auto-click flow
  // ---------------------------------------------------------------------------

  /**
   * Phase 1: Find and click the "open camera" button.
   * After clicking, schedule phase 2 (photo).
   */
  function clickCameraButton() {
    if (sequenceState !== 'waiting_modal') return;

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;
    const btn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, rootNode);

    if (!btn) {
      // Camera button not found — maybe we can skip to photo or compare
      debug('Camera button not found, looking for photo/compare button directly');
      const photoBtn = findButton(FACE_UI_SELECTORS.PHOTO_BTN, null, rootNode);
      if (photoBtn && btnTextMatches(photoBtn, BTN_TEXT.PHOTO) && !btnTextMatches(photoBtn, BTN_TEXT.RETAKE)) {
        // Camera already open, photo button visible — jump to photo phase
        debug('Found photo button directly — skipping camera phase');
        transitionState('camera_opening');
        clickPhotoButton();
        return;
      }
      const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);
      if (compareBtn) {
        debug('Found compare button directly — skipping to compare phase');
        transitionState('photo_taking');
        clickCompareButton();
        return;
      }
      debug('No camera, photo, or compare button found yet');
      return;
    }

    transitionState('camera_opening');
    clickElement(btn, '开启摄像头');

    // Schedule photo click after camera opens
    const timer = setTimeout(() => {
      clickPhotoButton();
    }, jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
    sequenceTimers.push(timer);
  }

  /**
   * Phase 2: Click the "拍照" button (has class .btn_again).
   * This button appears after the camera is opened.
   * Also handles "重新拍照" — re-takes the photo and then proceeds to compare.
   */
  function clickPhotoButton() {
    if (sequenceState !== 'camera_opening') return;

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;

    // Look for "拍照" button (.btn_again with text "拍照" but NOT "重新拍照")
    const allBtnAgain = rootNode.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
    let photoBtn = null;
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.PHOTO) && !btnTextMatches(btn, BTN_TEXT.RETAKE)) {
        photoBtn = btn;
        break;
      }
    }

    // Also check if compare button already appeared
    const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);

    if (!photoBtn) {
      // No photo button — maybe compare already visible
      if (compareBtn) {
        if (!getSetting('autoCompare', true)) {
          info('Compare button visible but autoCompare OFF — pausing');
          appendLog('检测到对比按钮，自动对比已关闭 — 请手动点击');
          transitionState('photo_taken');
          return;
        }
        debug('Photo button not found, compare button visible — clicking compare directly');
        transitionState('photo_taking');
        clickCompareButton();
        return;
      }
      warn('Photo button not found after opening camera');
      return;
    }

    // Photo button found (guaranteed to be pure "拍照" at this point —
    // "重新拍照" was branched off above).
    //
    // If the compare button also already appeared alongside, it means the
    // page auto-took a photo.  We still want to click "拍照" to refresh
    // the pool image, so fall through to the normal flow below.

    transitionState('photo_taking');
    clickElement(photoBtn, '拍照');

    // Check autoCompare setting: when OFF, pause for manual confirmation
    if (!getSetting('autoCompare', true)) {
      transitionState('photo_taken');
      info('Photo taken — autoCompare OFF, pausing for manual confirmation');
      appendLog('拍摄完成 — 请确认后手动点击「开始对比」');
      setStatus(true, '等待确认 — 请手动点击对比');
      return;
    }

    // Schedule comparison click after photo is taken
    const timer = setTimeout(() => {
      clickCompareButton();
    }, jitterMs(AUTO_CONFIG.PHOTO_DELAY_MS, 0.3));
    sequenceTimers.push(timer);
  }

  /**
   * Phase 3: Click the "start comparison" button.
   * Retries a few times with short delays if the button isn't in the DOM yet.
   * Exported so the UI can trigger it manually when autoCompare is OFF.
   */
  function clickCompareButton() {
    if (sequenceState !== 'photo_taking' && sequenceState !== 'photo_taken') return;

    // Refuse to submit another comparison when the retry limit is exhausted.
    // This guard catches callers outside the normal checkAndStartSequence flow
    // (e.g. clickCameraButton → clickCompareButton bypass, or the autoCompare
    // toggle listener) that could otherwise trigger a compare after exhaustion.
    if (compareAttempts >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) return;

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;

    // Check for "重新拍照" button — if visible, photo was taken and compare should appear
    const allBtnAgain = rootNode.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.RETAKE)) {
        break;
      }
    }

    const btn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);

    if (!btn) {
      // Compare button not yet in DOM — retry
      if (compareRetries < AUTO_CONFIG.MAX_COMPARE_RETRIES) {
        compareRetries++;
        debug(`Compare button not found, retry ${compareRetries}/${AUTO_CONFIG.MAX_COMPARE_RETRIES}`);
        const timer = setTimeout(() => clickCompareButton(), jitterMs(AUTO_CONFIG.COMPARE_RETRY_DELAY_MS, 0.25));
        sequenceTimers.push(timer);
        return;
      }

      warn('Compare button not found after retries — trying fallback');
      // Last resort: click any non-camera, non-photo face button
      const faceBtns = rootNode.querySelectorAll('.face_btns');
      for (const fb of faceBtns) {
        const text = (fb.textContent || '').trim();
        if (!btnTextMatches(fb, BTN_TEXT.CAMERA) && !btnTextMatches(fb, BTN_TEXT.PHOTO)) {
          clickElement(fb, `备选按钮 ("${text}")`);
          break;
        }
      }
      return;
    }

    transitionState('comparing');
    compareRetries = 0;
    _lastCompareSubmittedAt = Date.now();
    _compareCooldownMs = jitterMsFloor(AUTO_CONFIG.COMPARE_COOLDOWN_MS, 0.3);
    clickElement(btn, '开始对比');
    // Reset retry counter on successful comparison submission
    if (retryAttempt > 0) {
      info(`Retry counter reset (${retryAttempt} → 0) — compare submitted`);
      retryAttempt = 0;
      retryExhausted = false;
    }
  }

  /**
   * Check for a genuine retry button ("重试") and click it.
   * IMPORTANT: "拍照" and "重新拍照" also use .btn_again — we must distinguish
   * by text content and NOT treat "拍照" as a retry button.
   */
  function clickRetryButton() {
    if (retryExhausted) return false;

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;

    // Only look for genuine retry buttons by text content
    // "重试" is the actual retry button; "拍照" and "重新拍照" are NOT retries
    const retryBtn = findButton(null, BTN_TEXT.RETRY, rootNode);
    if (!retryBtn) return false;

    // Enforce max retry attempts
    if (retryAttempt >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
      exhaustRetries();
      return false;
    }

    retryAttempt++;
    const delay = getBackoffDelay();

    info(`Retry attempt ${retryAttempt}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} — waiting ${(delay / 1000).toFixed(1)}s`);
    appendLog(`重试第 ${retryAttempt}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次 — 等待 ${(delay / 1000).toFixed(1)} 秒`);

    // Record failure for the last picked image — the retry means verification failed
    recordLastPickResult(false);

    clickElement(retryBtn, '重试');

    // Reset state to start the sequence over after backoff delay
    clearSequence();
    transitionState('waiting_modal');
    retryBackoffTimer = setTimeout(() => clickCameraButton(), delay);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Compare-fail recovery
  // ---------------------------------------------------------------------------

  /**
   * Handle the case where the previous comparison was rejected.
   * Called when sequenceState is 'comparing' but the modal is still visible.
   *
   * Three recovery paths:
   *   1. "重新拍照" + "开始对比" both visible → click retake, re-enter photo pipeline
   *   2. Only "开始对比" visible → click compare directly
   *   3. "开启摄像头" visible → modal fully reset; restart from scratch
   *
   * Paths 1 & 2 are guarded by a cooldown — while the server is processing the
   * original compare, the page shows the same buttons as a rejection, so we
   * schedule a re-check after the cooldown expires rather than acting early.
   * Path 3 bypasses the cooldown because the modal can only reset to "开启摄像头"
   * AFTER the server has responded, so there is no ambiguity.
   *
   * @param {HTMLElement} modal - The face verification modal element
   * @returns {boolean} true if recovery was attempted
   */
  function handleCompareFailRecovery(modal) {
    // Enforce max consecutive compare retries
    if (compareAttempts >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
      warn(`Compare retry limit reached (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}). Stopping.`);
      appendLog(`对比重试次数已达上限 (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次)，请手动操作`);
      setStatus(false, '已停止 — 对比重试次数已达上限');
      transitionState('photo_taken'); // terminal state — blocks Watchdog and new sequences
      return true; // modal is present; caller should not start a new sequence
    }

    const elapsed = Date.now() - _lastCompareSubmittedAt;
    const cooldownActive = _lastCompareSubmittedAt > 0 && elapsed < _compareCooldownMs;
    if (cooldownActive) {
      debug(`Compare cooldown active (${elapsed}ms / ${_compareCooldownMs}ms)`);
    }

    const allBtnAgain = modal.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
    let retakeBtn = null;
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.RETAKE)) { retakeBtn = btn; break; }
    }
    const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, modal);

    // ── Path 1: both "重新拍照" and "开始对比" visible ─────────────────
    // Ambiguous state — same DOM during server wait and after rejection.
    // Cooldown MUST be respected.
    if (retakeBtn && compareBtn) {
      if (cooldownActive) {
        scheduleCooldownRecheck(elapsed);
        return false;
      }

      compareAttempts++;
      const gapMs = getCompareRetryGapMs();
      info(`Verification failed — retry ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}: waiting ${(gapMs / 1000).toFixed(1)}s before retake`);
      appendLog(`验证未通过，${(gapMs / 1000).toFixed(1)}秒后自动重试第 ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次`);

      // Record failure for the last picked image
      recordLastPickResult(false);

      // Clear pending timers (don't touch compareAttempts)
      sequenceTimers.forEach(clearTimeout);
      sequenceTimers = [];
      compareRetries = 0;

      // Transition now so handleCompareFailRecovery doesn't re-enter while
      // the gap timer runs.  state=camera_opening is semantically correct:
      // once the gap expires we'll click retake, which re-opens the camera.
      transitionState('camera_opening');

      const gapTimer = setTimeout(() => {
        const curModal = document.querySelector(FACE_UI_SELECTORS.MODAL);
        if (!curModal) return;
        const retake = findButton(FACE_UI_SELECTORS.PHOTO_BTN, BTN_TEXT.RETAKE, curModal);
        if (!retake) return;
        clickElement(retake, '重新拍照');

        // After retake the camera re-opens → go through the normal pipeline
        const photoTimer = setTimeout(() => clickPhotoButton(), jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
        sequenceTimers.push(photoTimer);
      }, gapMs);
      sequenceTimers.push(gapTimer);
      return true;
    }

    // ── Path 2: only "开始对比" visible (no "重新拍照") ────────────────
    // Also ambiguous — cooldown applies.
    if (!retakeBtn && compareBtn) {
      if (cooldownActive) {
        scheduleCooldownRecheck(elapsed);
        return false;
      }

      compareAttempts++;
      const gapMs = getCompareRetryGapMs();
      info(`Verification failed — retry ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}: waiting ${(gapMs / 1000).toFixed(1)}s before direct compare`);
      appendLog(`验证未通过，${(gapMs / 1000).toFixed(1)}秒后直接对比重试第 ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次`);

      // Record failure for the last picked image
      recordLastPickResult(false);

      // Transition now to prevent re-entry while the gap timer runs
      transitionState('photo_taking');

      const gapTimer = setTimeout(() => {
        clickCompareButton();
      }, gapMs);
      sequenceTimers.push(gapTimer);
      return true;
    }

    // ── Path 3: modal fully reset to initial "开启摄像头" state ─────────
    // No cooldown guard here.  The modal can only transition to this state
    // AFTER the server has responded with a rejection — the DOM went from
    // "retake + compare" (pending) → "camera" (rejected).  There is no
    // ambiguity, so we act immediately.
    const cameraBtn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, modal);
    if (cameraBtn) {
      compareAttempts++;
      info(`Verification failed — retry ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}: modal reset to initial state`);
      appendLog(`验证未通过，自动重试第 ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次（重新开始）`);

      // Record failure for the last picked image
      recordLastPickResult(false);

      // Reset state so checkAndStartSequence can start a fresh sequence
      clearSequence();
      // Keep compareAttempts — it tracks consecutive failures within the same
      // modal session and is only reset when the modal closes or processor stops.
      return false; // Let checkAndStartSequence fall through to startModalSequence
    }

    // Neither button visible yet — fall through
    return false;
  }

  // ---------------------------------------------------------------------------
  // Modal sequence start
  // ---------------------------------------------------------------------------

  /**
   * Kick off a fresh auto-click sequence when the face modal first appears.
   * @param {HTMLElement} modal
   */
  function startModalSequence(modal) {
    if (retryAttempt > 0) {
      info(`Retry counter reset (${retryAttempt} → 0) — new modal detected`);
      retryAttempt = 0;
      retryExhausted = false;
    }

    transitionState('waiting_modal');
    info('Face verification modal detected, starting auto-click sequence');
    appendLog('检测到人脸验证窗口，开始自动操作');
    setStatus(true, '运行中 — 自动处理人脸验证');

    // Give the modal time to fully render, then begin
    const timer = setTimeout(() => {
      clickCameraButton();
    }, jitterMs(AUTO_CONFIG.CLICK_DELAY_MS, 0.4));
    sequenceTimers.push(timer);
  }

  // ---------------------------------------------------------------------------
  // Modal detection & sequence kickoff
  // ---------------------------------------------------------------------------

  /**
   * Check if the face verification modal is present and start the sequence.
   * @returns {boolean} Whether the modal was detected
   */
  function checkAndStartSequence() {
    // Check settings — skip if auto-click is disabled
    if (!isFaceAutoActive()) {
      debug('Auto-processor: face auto not active, skipping');
      return false;
    }

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    if (!modal) {
      if (isVerificationInFlight()) {
        // Modal disappeared while a verification attempt was in flight —
        // the comparison was accepted → record success for the last picked image.
        info(`Face modal closed during "${sequenceState}" → verification SUCCESS`);
        recordLastPickResult(true);
      }
      if (sequenceState !== 'idle') {
        debug('Face modal disappeared, resetting auto-processor state');
        clearSequence();
        compareAttempts = 0;
      }
      return false;
    }

    // Log available buttons for debugging
    debug('Auto-processor: modal found, scanning buttons');
    const allBtns = modal.querySelectorAll('.face_btns, .face_btn, .ant-btn, button');
    for (const btn of allBtns) {
      debug(`  Button: classes="${btn.className}" text="${(btn.textContent || '').trim().substring(0, 30)}"`);
    }

    // ── Early-exit: compare attempts exhausted ──────────────────────────
    // If we've already tried the maximum number of comparison cycles and
    // the modal is still present, park in a terminal state.  This prevents
    // the Watchdog → startModalSequence → clickCompare → exhaustion → repeat
    // infinite loop that otherwise occurs when the server is slow to respond
    // and the state machine exhausts its compare retries before the server
    // returns a result.
    if (compareAttempts >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
      if (sequenceState !== 'photo_taken') {
        warn('Check: compare retry limit exhausted — parking in terminal state');
        transitionState('photo_taken');
        appendLog('对比重试已达上限，已暂停 — 请手动操作');
        setStatus(false, '已暂停 — 对比重试已达上限');
      }
      return true;
    }

    // ── Watchdog: detect stuck sequence states ──────────────────────────
    // If the state machine has been parked in the same non-idle state for
    // longer than WATCHDOG_TIMEOUT_MS, something went wrong (e.g. the DOM
    // never updated and the MutationObserver stayed silent).  Force a reset
    // so the processor can re-scan and recover.
    //
    // photo_taken is excluded — it means autoCompare is OFF and the user
    // intentionally wants manual confirmation; the pause is expected.
    if (sequenceState !== 'idle' && sequenceState !== 'photo_taken'
        && _stateEnteredAt > 0
        && (Date.now() - _stateEnteredAt) > WATCHDOG_TIMEOUT_MS) {
      warn(`Watchdog: state "${sequenceState}" stuck for ${Date.now() - _stateEnteredAt}ms — forcing reset`);
      appendLog('自动操作卡住超时，正在重置');
      clearSequence();
      // Guard: if compare attempts are already exhausted, parking in photo_taken
      // prevents the Watchdog from triggering new sequences — which would just
      // be blocked again, creating an infinite restart loop.
      if (compareAttempts >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
        warn('Compare retry limit exhausted — parking in terminal state');
        transitionState('photo_taken');
        appendLog('对比重试已达上限，已暂停 — 请手动操作');
        setStatus(false, '已暂停 — 对比重试已达上限');
        return true;
      }
      // Keep compareAttempts — watchdog fires on transient stalls, not
      // verification failures.  Resetting the counter would allow infinite
      // retry loops when the page is consistently slow.
      // Fall through to start a fresh sequence below
    }

    // 1. Check for genuine retry button ("重试")
    if (clickRetryButton()) return true;

    // 2. Compare-fail recovery
    if (sequenceState === 'comparing' && handleCompareFailRecovery(modal)) return true;

    // 2b. Fresh-modal guard: when the state machine is stuck in any non-idle
    //     state from a previous (possibly interrupted) sequence, but the DOM
    //     shows a brand-new modal with camera or photo buttons, reset and
    //     start over.  This recovers from two scenarios:
    //
    //       a) SPA navigation replaced the old modal while state was still
    //          in-flight — the new modal appears with "开启摄像头";
    //       b) handleCompareFailRecovery mis-fired on a slow-but-successful
    //          compare (cooldown expired while server was still processing),
    //          advancing state to camera_opening before the server closed
    //          the modal — leaving state stuck when the next modal opens.
    if (sequenceState !== 'idle' && sequenceState !== 'photo_taken') {
      const freshCameraBtn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, modal);
      const allPhotoBtns = modal.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
      let freshPhotoBtn = null;
      for (const btn of allPhotoBtns) {
        if (btnTextMatches(btn, BTN_TEXT.PHOTO) && !btnTextMatches(btn, BTN_TEXT.RETAKE)) { freshPhotoBtn = btn; break; }
      }
      if (freshCameraBtn || freshPhotoBtn) {
        debug(`State is "${sequenceState}" but fresh modal detected (camera=${!!freshCameraBtn} photo=${!!freshPhotoBtn}) — resetting and restarting`);
        clearSequence();
        // Keep compareAttempts — it tracks failures within the same modal
        // session.  Only the modal-close (success) or stopAutoProcessor
        // should reset this counter.
        startModalSequence();
        return true;
      }
    }

    // 3. Guard: don't restart if already in a non-idle state.
    //    photo_taken means autoCompare is OFF and we're intentionally paused
    //    waiting for manual confirmation — only the autoCompare toggle
    //    listener or modal-close should move us out of this state.
    if (sequenceState !== 'idle') return true;

    // 3b. Secondary exhaustion guard — catches the rare case where
    //     handleCompareFailRecovery Path 3 increments compareAttempts to the
    //     limit and returns false (letting us fall through to here), or where
    //     the Watchdog resets state to idle while compareAttempts is exhausted.
    if (compareAttempts >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
      warn('Start-sequence blocked: compare retries exhausted');
      transitionState('photo_taken');
      appendLog('对比重试已达上限，已暂停 — 请手动操作');
      setStatus(false, '已暂停 — 对比重试已达上限');
      return true;
    }

    // 4. Start a fresh sequence (only from idle)
    startModalSequence();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Retry handler — called from UI panel
  // ---------------------------------------------------------------------------

  /**
   * Handle the retry custom event dispatched from the UI panel.
   */
  function onRetry() {
    if (!isFaceAutoActive()) {
      warn('Manual retry ignored — face auto is disabled');
      appendLog('手动重试已忽略 — 过人脸已关闭');
      return;
    }

    info('Manual retry received — scanning for face UI elements');
    appendLog('已触发手动重试');

    // Reset sequence state so we can re-enter the flow
    clearSequence();
    // Reset the comparison counter — the user explicitly requested a retry,
    // so their intent is clear and we should allow another full cycle.
    compareAttempts = 0;

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;

    // Try genuine retry button first
    const retryBtn = findButton(null, BTN_TEXT.RETRY, rootNode);
    if (retryBtn) {
      clickElement(retryBtn, '重试按钮');
      transitionState('waiting_modal');
      setTimeout(() => clickCameraButton(), jitterMs(AUTO_CONFIG.RETRY_CAMERA_DELAY_MS, 0.35));
      return;
    }

    const cameraBtn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, rootNode);
    if (cameraBtn) {
      clickElement(cameraBtn, '开启摄像头');
      transitionState('camera_opening');
      setTimeout(() => clickPhotoButton(), jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
      return;
    }

    // Look for "拍照" specifically (not "重新拍照" — that's handled as a retake below)
    const allBtnAgain = rootNode.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.PHOTO) && !btnTextMatches(btn, BTN_TEXT.RETAKE)) {
        clickElement(btn, '拍照');
        transitionState('photo_taking');
        setTimeout(() => clickCompareButton(), jitterMs(AUTO_CONFIG.PHOTO_DELAY_MS, 0.3));
        return;
      }
    }

    // "重新拍照" — retake, then schedule the photo pipeline
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.RETAKE)) {
        clickElement(btn, '重新拍照');
        transitionState('camera_opening');
        setTimeout(() => clickPhotoButton(), jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
        return;
      }
    }

    const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);
    if (compareBtn) {
      clickElement(compareBtn, '开始对比按钮');
      return;
    }

    warn('No face UI element found on manual retry');
    appendLog('未找到可点击的人脸验证元素');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start observing the DOM for face verification popups.
   */
  function startAutoProcessor() {
    if (observerUnsubscribe$1) {
      warn('Auto-processor is already running');
      return;
    }

    // Fresh start — clear no-repeat exclusion so all images are eligible
    resetNoRepeatState();

    // Initial scan — check if modal is already present
    checkAndStartSequence();

    // Register with the shared body-level MutationObserver
    observerUnsubscribe$1 = registerBodyMutationHandler((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList'
            && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
          if (retryExhausted) break;

          // Skip mutations originating from our own UI panel.
          // Course progress updates (textContent changes on progress bars)
          // trigger childList mutations that would otherwise be misread as
          // page activity and spuriously wake the face verification state
          // machine.  See: shared MutationObserver → refreshCourseProgress
          // → pushProgress → onTimeUpdate → video element timeupdate event.
          if (mutation.target.closest && mutation.target.closest('.bfw-panel')) continue;

          clearTimeout(debounceTimer);
          const baseDebounce = retryAttempt > 0
            ? Math.min(AUTO_CONFIG.CLICK_DELAY_MS * (retryAttempt + 1), 2000)
            : AUTO_CONFIG.CLICK_DELAY_MS;
          debounceTimer = setTimeout(() => {
            checkAndStartSequence();
          }, jitterMs(baseDebounce, 0.35));
          break;
        }
      }
    });

    document.addEventListener('bfw:retry', onRetry);

    info('Auto-processor started');
    setStatus(true, '运行中 — 正在处理人脸验证');
    appendLog('自动处理器已启动');
  }

  /**
   * Start the auto-processor and disconnect the observer.
   */
  function stopAutoProcessor() {
    if (observerUnsubscribe$1) {
      observerUnsubscribe$1();
      observerUnsubscribe$1 = null;
    }
    clearTimeout(debounceTimer);
    debounceTimer = null;
    clearTimeout(retryBackoffTimer);
    retryBackoffTimer = null;
    clearSequence();
    document.removeEventListener('bfw:retry', onRetry);
    retryAttempt = 0;
    retryExhausted = false;
    compareAttempts = 0;
    setStatus(false, '已停止');
    appendLog('自动处理器已停止');
    info('Auto-processor stopped');
  }

  /**
   * Reset the auto-processor sequence state without stopping the observer.
   * Allows the overlay's camera toggle to restart the flow from scratch
   * (avoids the processor being stuck in 'photo_taken' or other states).
   */
  function resetAutoSequence() {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    clearTimeout(retryBackoffTimer);
    retryBackoffTimer = null;
    clearSequence();
    retryAttempt = 0;
    retryExhausted = false;
    compareAttempts = 0;
    resetNoRepeatState();
    debug('Auto-processor: sequence reset for camera toggle');
  }

  // ---------------------------------------------------------------------------
  // Settings listener
  // ---------------------------------------------------------------------------

  function syncProcessorFromSettings() {
    const shouldRun = isFaceAutoActive();
    if (shouldRun && !observerUnsubscribe$1) {
      startAutoProcessor();
    } else if (!shouldRun && observerUnsubscribe$1) {
      stopAutoProcessor();
    }
  }

  onChange('faceAutoClick', () => syncProcessorFromSettings());

  // When autoCompare is toggled ON while paused at photo_taken, resume the flow
  onChange('autoCompare', (val) => {
    if (val && sequenceState === 'photo_taken') {
      // Respect exhaustion: photo_taken is also used as the terminal state
      // for exhausted compare retries — don't resume in that case.
      if (compareAttempts >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
        warn('autoCompare toggled ON but compare retries exhausted — ignored');
        return;
      }
      info('autoCompare toggled ON — resuming comparison');
      appendLog('自动对比已开启 — 继续执行对比');
      setStatus(true, '运行中 — 正在处理人脸验证');
      // Short delay to allow the UI to update before clicking
      const timer = setTimeout(() => clickCompareButton(), jitterMs(300, 0.4));
      sequenceTimers.push(timer);
    }
  });

  /**
   * @file Video overlay — controls overlaid on the fake stream video element.
   *
   * Detects when a <video> element receives a fake MediaStream (created by
   * video-interceptor.js) and overlays HTML buttons for switching to the real
   * camera or refreshing the pool image.
   *
   * Uses two detection mechanisms:
   *   1. MutationObserver — watches for new <video> elements added to the DOM.
   *   2. srcObject setter hook — intercepts video.srcObject assignments so we
   *      catch streams assigned after the video element is already in the DOM.
   *
   * Overlay buttons:
   *   - 换一张 (Refresh Image): pick a new random pool image for the canvas.
   *   - 切换真实/模拟 (Toggle Real/Fake): temporarily switch between fake and
   *     real camera streams on the video element.
   */


  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /**
   * @typedef {Object} OverlayState
   * @property {MediaStream|null} fakeStream  - Current fake stream (null when in real mode)
   * @property {MediaStream|null} realStream  - Cached real stream (null when in fake mode)
   * @property {MediaStreamConstraints|null} constraints - Original getUserMedia constraints
   * @property {'fake'|'real'} mode            - Current display mode
   * @property {HTMLElement} overlayEl         - The overlay container DOM element
   * @property {ResizeObserver|null} resizeObserver
   */

  /** Map of <video> element → OverlayState. */
  const overlayMap = new Map();

  /** Whether the srcObject setter has been hooked. */
  let srcObjectHooked = false;

  /** Unsubscribe function for the shared body MutationObserver. */
  let observerUnsubscribe = null;

  // ---------------------------------------------------------------------------
  // Overlay DOM creation
  // ---------------------------------------------------------------------------

  /**
   * Create the overlay DOM element with mode badge and control buttons.
   * @returns {HTMLElement}
   */
  function createOverlayDOM() {
    const overlay = document.createElement('div');
    overlay.className = 'bfw-video-overlay';
    overlay.innerHTML = `
    <div class="bfw-overlay-mode-badge mode-fake">模拟</div>
    <div class="bfw-video-overlay-btns">
      <button class="bfw-overlay-btn bfw-overlay-btn-refresh" title="从图片池中随机更换一张人脸">${icons.refresh} 换一张</button>
      <button class="bfw-overlay-btn bfw-overlay-btn-toggle" title="暂时切换为真实摄像头">${icons.cameraToggle} 切换真实</button>
    </div>
  `;
    return overlay;
  }

  /**
   * Update overlay UI elements to reflect the current mode.
   * @param {OverlayState} state
   */
  function updateOverlayUI(state) {
    const { overlayEl, mode } = state;
    if (!overlayEl) return;

    const modeBadge = overlayEl.querySelector('.bfw-overlay-mode-badge');
    const toggleBtn = overlayEl.querySelector('.bfw-overlay-btn-toggle');
    const refreshBtn = overlayEl.querySelector('.bfw-overlay-btn-refresh');

    if (mode === 'fake') {
      if (modeBadge) {
        modeBadge.textContent = '模拟';
        modeBadge.className = 'bfw-overlay-mode-badge mode-fake';
      }
      if (toggleBtn) {
        toggleBtn.innerHTML = `${icons.cameraToggle} 切换真实`;
        toggleBtn.className = 'bfw-overlay-btn bfw-overlay-btn-toggle';
        toggleBtn.title = '暂时切换为真实摄像头';
      }
      if (refreshBtn) refreshBtn.disabled = false;
    } else {
      if (modeBadge) {
        modeBadge.textContent = '真实';
        modeBadge.className = 'bfw-overlay-mode-badge mode-real';
      }
      if (toggleBtn) {
        toggleBtn.innerHTML = `${icons.video} 切回模拟`;
        toggleBtn.className = 'bfw-overlay-btn bfw-overlay-btn-toggle mode-real';
        toggleBtn.title = '切回模拟摄像头';
      }
      if (refreshBtn) refreshBtn.disabled = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Button handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle "换一张" (Refresh Image) button click.
   * @param {HTMLVideoElement} _video
   * @param {OverlayState} state
   */
  async function onRefreshImage(_video, state) {
    if (state.mode !== 'fake' || !state.fakeStream) return;

    const ok = await refreshStreamImage(state.fakeStream);
    if (ok) {
      info('Overlay: refreshed pool image');
    } else {
      warn('Overlay: failed to refresh pool image (stream may have ended or pool empty)');
      appendLog('换一张失败 — 图片池可能为空');
    }
  }

  /**
   * Handle "切换真实/模拟" (Toggle Real/Fake) button click.
   * @param {HTMLVideoElement} video
   * @param {OverlayState} state
   */
  async function onToggleRealFake(video, state) {
    const constraints = state.constraints || { video: true, audio: false };
    const btn = state.overlayEl?.querySelector('.bfw-overlay-btn-toggle');

    if (btn) btn.disabled = true;

    // Reset the auto-click sequence so it doesn't race ahead after we switch.
    // The next DOM change (from clicking 重新拍照) will restart it naturally.
    resetAutoSequence();

    if (state.mode === 'fake') {
      // Switch FROM fake TO real camera
      try {
        const realStream = await switchToRealCamera(state.fakeStream, constraints);
        state.realStream = realStream;
        state.fakeStream = null;
        state.mode = 'real';
        video.srcObject = realStream;
        updateOverlayUI(state);
        info('Overlay: switched to real camera');
        appendLog('已切换到真实摄像头');

        // Click 重新拍照 if visible, so the page re-takes the photo
        // with the real camera feed instead of the old fake one.
        setTimeout(() => {
          const retake = findButton('.face_btns.btn_again', BTN_TEXT.RETAKE);
          if (retake) {
            retake.click();
            info('Overlay: clicked 重新拍照 after real camera switch');
            appendLog('已触发重新拍照');
          }
        }, 400);
      } catch (e) {
        warn('Overlay: failed to switch to real camera:', e);
        appendLog('无法切换到真实摄像头 — 请检查权限');
        // switchToRealCamera now acquires the real stream BEFORE stopping
        // the fake one, so on failure the fake stream is still intact and
        // the video element continues showing the pool image.
      }
    } else {
      // Switch FROM real TO fake camera
      try {
        const fakeStream = await switchToFakeCamera(state.realStream, constraints);
        state.fakeStream = fakeStream;
        state.realStream = null;
        state.mode = 'fake';
        video.srcObject = fakeStream;
        updateOverlayUI(state);
        info('Overlay: switched back to fake camera');
        appendLog('已切回模拟摄像头');

        // Also click 重新拍照 to retake with the fake feed.
        setTimeout(() => {
          const retake = findButton('.face_btns.btn_again', BTN_TEXT.RETAKE);
          if (retake) {
            retake.click();
            info('Overlay: clicked 重新拍照 after fake camera switch');
            appendLog('已触发重新拍照');
          }
        }, 400);
      } catch (e) {
        warn('Overlay: failed to switch to fake camera:', e);
        appendLog('无法切回模拟摄像头 — 图片池可能为空');
      }
    }

    if (btn) btn.disabled = false;
  }

  // ---------------------------------------------------------------------------
  // Overlay lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Attach an overlay to a <video> element that is playing a fake stream.
   * @param {HTMLVideoElement} video
   * @param {MediaStream} fakeStream
   */
  function attachOverlay(video, fakeStream) {
    if (overlayMap.has(video)) return; // Already has an overlay

    const constraints = getStreamConstraints(fakeStream);

    // Ensure the video's parent has position: relative (or absolute/fixed)
    // so the overlay can be positioned absolutely within it.
    const parent = video.parentElement;
    if (parent) {
      const parentPos = getComputedStyle(parent).position;
      if (!parentPos || parentPos === 'static') {
        parent.style.position = 'relative';
      }
    }

    // Create overlay
    const overlayEl = createOverlayDOM();

    // Insert overlay as a sibling after the video (inside video's parent)
    if (parent) {
      parent.insertBefore(overlayEl, video.nextSibling);
    } else {
      // Video not in DOM yet — shouldn't happen in practice, but handle gracefully
      debug('Overlay: video element has no parent, cannot attach overlay');
      return;
    }

    const state = {
      fakeStream,
      realStream: null,
      constraints,
      mode: 'fake',
      overlayEl,
      resizeObserver: null,
    };

    // Bind button clicks
    const refreshBtn = overlayEl.querySelector('.bfw-overlay-btn-refresh');
    const toggleBtn = overlayEl.querySelector('.bfw-overlay-btn-toggle');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRefreshImage(video, state);
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onToggleRealFake(video, state);
      });
    }

    // Keep overlay sized to match the video using ResizeObserver
    try {
      const ro = new ResizeObserver(() => {
        // Overlay is position:absolute with inset:0 relative to the video's parent,
        // so its size automatically tracks the parent. But we still watch for
        // reference so we can detect when the video is removed/hidden.
      });
      ro.observe(video);
      state.resizeObserver = ro;
    } catch (_) { /* ResizeObserver not supported — overlay still works via CSS */ }

    overlayMap.set(video, state);
    info('Overlay: attached controls to video element');
  }

  /**
   * Clean up overlay for a specific video element.
   * @param {HTMLVideoElement} video
   */
  function cleanupOverlay(video) {
    const state = overlayMap.get(video);
    if (!state) return;

    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
    }
    if (state.overlayEl && state.overlayEl.parentNode) {
      state.overlayEl.parentNode.removeChild(state.overlayEl);
    }
    overlayMap.delete(video);
    debug('Overlay: cleaned up overlay for video element');
  }

  // ---------------------------------------------------------------------------
  // Video element discovery
  // ---------------------------------------------------------------------------

  /**
   * Check if a video element is playing our fake stream and attach overlay if so.
   * @param {HTMLVideoElement} video
   */
  function checkVideoElement(video) {
    // Skip if already has an overlay
    if (overlayMap.has(video)) return;

    // Must be in the DOM
    if (!video.isConnected) return;

    const stream = video.srcObject;
    if (stream instanceof MediaStream && isStreamFake(stream)) {
      attachOverlay(video, stream);
    }
  }

  // ---------------------------------------------------------------------------
  // srcObject setter hook
  // ---------------------------------------------------------------------------

  /**
   * Monkey-patch HTMLMediaElement.prototype.srcObject setter to detect
   * when a page script assigns a fake stream to a video element.
   */
  function hookSrcObjectSetter() {
    if (srcObjectHooked) return;

    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype, 'srcObject',
    );

    if (!descriptor || !descriptor.set) {
      warn('Overlay: cannot hook srcObject setter — overlay detection may be unreliable');
      return;
    }

    const originalSetter = descriptor.set;

    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      ...descriptor,
      set(value) {
        // Call original setter first
        originalSetter.call(this, value);

        // Check if the assigned stream is a fake stream we created
        if (value instanceof MediaStream && isStreamFake(value)) {
          // Delay slightly to let the DOM settle
          if (this instanceof HTMLVideoElement) {
            // Use requestAnimationFrame to let the page finish its update
            requestAnimationFrame(() => {
              checkVideoElement(this);
            });
          }
        }
      },
    });

    srcObjectHooked = true;
    debug('Overlay: hooked srcObject setter');
  }

  // ---------------------------------------------------------------------------
  // MutationObserver — detect new video elements
  // ---------------------------------------------------------------------------

  /**
   * Scan all <video> elements in the document and check for fake streams.
   */
  function scanForVideos() {
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      checkVideoElement(video);
    }
  }

  /**
   * Start observing the DOM for new <video> elements.
   * Uses the shared body-level MutationObserver to avoid creating a
   * redundant observer alongside the auto-processor.
   */
  function startObserving() {
    if (observerUnsubscribe) return; // Already observing

    observerUnsubscribe = registerBodyMutationHandler((mutations) => {
      for (const mutation of mutations) {
        // Check added nodes for new video elements
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLVideoElement) {
            checkVideoElement(node);
          }
          // Also check descendants of added nodes
          if (node instanceof HTMLElement && node.querySelector) {
            const videos = node.querySelectorAll('video');
            for (const video of videos) {
              checkVideoElement(video);
            }
          }
        }

        // Clean up overlays for removed video elements
        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLVideoElement) {
            cleanupOverlay(node);
          }
          if (node instanceof HTMLElement && node.querySelector) {
            const videos = node.querySelectorAll('video');
            for (const video of videos) {
              cleanupOverlay(video);
            }
          }
        }
      }
    });

    debug('Overlay: registered with shared MutationObserver');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Initialize the video overlay system.
   *
   * Called once at bootstrap time. Hooks the srcObject setter and starts
   * watching for video elements that receive fake streams.
   */
  function initVideoOverlay() {
    // Hook srcObject before any page script assigns streams
    hookSrcObjectSetter();

    // Watch for video elements added to the DOM
    if (document.body) {
      startObserving();
      // Initial scan for any video elements already present
      scanForVideos();
    } else {
      // DOM not ready yet — defer
      document.addEventListener('DOMContentLoaded', () => {
        startObserving();
        scanForVideos();
      });
    }

    debug('Overlay: initialized');
  }

  /**
   * @file Visibility interceptor — prevents the site from detecting tab-switch or window minimization.
   *
   * 百分网 (tj.100.wang) uses the Page Visibility API and blur events to detect when the
   * user switches tabs or minimizes the window, then pauses the video and shows a warning:
   * "检测到您可能已离开本窗口，已自动暂停播放视频".
   *
   * This module intercepts every known detection vector so the site believes the page
   * is always visible and focused, regardless of the actual window state.
   *
   * Vectors covered:
   *   1. document.hidden                  → always false
   *   2. document.visibilityState         → always "visible"
   *   3. document.hasFocus()              → always true
   *   4. visibilitychange event           → captured & suppressed
   *   5. window blur event                → captured & suppressed
   *   6. document.onvisibilitychange      → setter intercepted
   *   7. window.onblur                    → setter intercepted
   *   8. document.webkitHidden (legacy)   → always false
   *   9. document.msHidden (legacy IE)    → always false
   *  10. pagehide / pageshow events       → captured & suppressed
   */


  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** Whether the interceptor is currently active (installed & enforcing). */
  let active = false;

  /** Whether install() has ever been called (prevents double-install). */
  let installed = false;

  // ---------------------------------------------------------------------------
  // Saved references for uninstall
  // ---------------------------------------------------------------------------

  /** Original document.hidden descriptor. */
  let _originalHiddenDescriptor = null;

  /** Original document.visibilityState descriptor. */
  let _originalVisibilityStateDescriptor = null;

  /** Original document.hasFocus function. */
  let _originalHasFocus = null;

  /** Original document.onvisibilitychange descriptor. */
  let _originalOnVisibilityChangeDescriptor = null;

  /** Original window.onblur descriptor. */
  let _originalOnBlurDescriptor = null;

  /** Original document.webkitHidden descriptor (if exists). */
  let _originalWebkitHiddenDescriptor = null;

  /** Original document.msHidden descriptor (if exists). */
  let _originalMsHiddenDescriptor = null;

  // ---------------------------------------------------------------------------
  // Event handlers (capture phase — fire before page listeners)
  // ---------------------------------------------------------------------------

  /**
   * Suppress visibilitychange events at the capture phase.
   * Calling stopImmediatePropagation() here prevents any non-capture listeners
   * (which is what the page registers) from ever seeing the event.
   */
  function onVisibilityChangeCapture(e) {
    if (!active) return;
    e.stopImmediatePropagation();
  }

  /**
   * Suppress window blur events at the capture phase.
   * We only intercept blur on the window object — child element blurs are
   * allowed through so UI interactions still work.
   */
  function onWindowBlurCapture(e) {
    if (!active) return;
    if (e.target === window || e.target === document) {
      e.stopImmediatePropagation();
    }
  }

  /**
   * Suppress pagehide events at the capture phase.
   * Some sites use this as an additional visibility signal.
   */
  function onPageHideCapture(e) {
    if (!active) return;
    e.stopImmediatePropagation();
  }

  /**
   * Suppress pageshow events at the capture phase.
   * (Symmetry — if we block pagehide we block pageshow too.)
   */
  function onPageShowCapture(e) {
    if (!active) return;
    e.stopImmediatePropagation();
  }

  // ---------------------------------------------------------------------------
  // Install
  // ---------------------------------------------------------------------------

  /**
   * Install the visibility interceptor.
   *
   * After calling this, document.hidden is always false and visibilitychange
   * events never reach page-registered listeners (the interceptor consumes them
   * at the capture phase before they bubble).  window blur events are also
   * suppressed at the capture phase for the window target only.
   *
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  function installVisibilityInterceptor() {
    if (installed) {
      debug('Visibility interceptor: already installed, skipping');
      return;
    }
    installed = true;

    // --- document.hidden ---
    try {
      _originalHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')
        || Object.getOwnPropertyDescriptor(document, 'hidden');
      Object.defineProperty(document, 'hidden', {
        get: () => active ? false : (_originalHiddenDescriptor
          ? _originalHiddenDescriptor.get.call(document)
          : false),
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      // Fallback: some browsers expose it on Document.prototype
      try {
        _originalHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
        Object.defineProperty(Document.prototype, 'hidden', {
          get: () => active ? false : (_originalHiddenDescriptor
            ? _originalHiddenDescriptor.get.call(document)
            : false),
          configurable: true,
          enumerable: true,
        });
      } catch (e2) {
        warn('Visibility interceptor: could not override document.hidden', e2);
      }
    }

    // --- document.visibilityState ---
    try {
      _originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')
        || Object.getOwnPropertyDescriptor(document, 'visibilityState');
      Object.defineProperty(document, 'visibilityState', {
        get: () => active ? 'visible' : (_originalVisibilityStateDescriptor
          ? _originalVisibilityStateDescriptor.get.call(document)
          : 'visible'),
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      try {
        _originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
        Object.defineProperty(Document.prototype, 'visibilityState', {
          get: () => active ? 'visible' : (_originalVisibilityStateDescriptor
            ? _originalVisibilityStateDescriptor.get.call(document)
            : 'visible'),
          configurable: true,
          enumerable: true,
        });
      } catch (e2) {
        warn('Visibility interceptor: could not override document.visibilityState', e2);
      }
    }

    // --- document.hasFocus ---
    try {
      _originalHasFocus = document.hasFocus;
      document.hasFocus = function hasFocus() {
        return active ? true : _originalHasFocus.call(document);
      };
    } catch (e) {
      warn('Visibility interceptor: could not override document.hasFocus', e);
    }

    // --- document.onvisibilitychange setter ---
    try {
      _originalOnVisibilityChangeDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'onvisibilitychange')
        || Object.getOwnPropertyDescriptor(document, 'onvisibilitychange');
      const target = _originalOnVisibilityChangeDescriptor ? Document.prototype : document;
      Object.defineProperty(target, 'onvisibilitychange', {
        get() {
          // Return the original getter value — the page can still read it
          return _originalOnVisibilityChangeDescriptor
            ? _originalOnVisibilityChangeDescriptor.get.call(this)
            : undefined;
        },
        set(fn) {
          if (_originalOnVisibilityChangeDescriptor) {
            _originalOnVisibilityChangeDescriptor.set.call(this, fn);
          }
          // We don't block the setter — the capture-phase listener already
          // suppresses the event.  Letting the setter through is harmless and
          // avoids breakage if the page checks for assignment success.
        },
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      debug('Visibility interceptor: could not intercept onvisibilitychange setter', e);
    }

    // --- window.onblur setter ---
    try {
      _originalOnBlurDescriptor = Object.getOwnPropertyDescriptor(Window.prototype, 'onblur')
        || Object.getOwnPropertyDescriptor(window, 'onblur');
      const target = _originalOnBlurDescriptor ? Window.prototype : window;
      Object.defineProperty(target, 'onblur', {
        get() {
          return _originalOnBlurDescriptor
            ? _originalOnBlurDescriptor.get.call(this)
            : undefined;
        },
        set(fn) {
          if (_originalOnBlurDescriptor) {
            _originalOnBlurDescriptor.set.call(this, fn);
          }
        },
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      debug('Visibility interceptor: could not intercept onblur setter', e);
    }

    // --- document.webkitHidden (legacy Safari/Chrome) ---
    try {
      if ('webkitHidden' in document) {
        _originalWebkitHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'webkitHidden');
        Object.defineProperty(document, 'webkitHidden', {
          get: () => active ? false : (_originalWebkitHiddenDescriptor
            ? _originalWebkitHiddenDescriptor.get.call(document)
            : false),
          configurable: true,
          enumerable: true,
        });
      }
    } catch (e) {
      debug('Visibility interceptor: could not override document.webkitHidden', e);
    }

    // --- document.msHidden (legacy IE) ---
    try {
      if ('msHidden' in document) {
        _originalMsHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'msHidden');
        Object.defineProperty(document, 'msHidden', {
          get: () => active ? false : (_originalMsHiddenDescriptor
            ? _originalMsHiddenDescriptor.get.call(document)
            : false),
          configurable: true,
          enumerable: true,
        });
      }
    } catch (e) {
      debug('Visibility interceptor: could not override document.msHidden', e);
    }

    // --- Event listeners (capture phase) ---
    document.addEventListener('visibilitychange', onVisibilityChangeCapture, true);
    window.addEventListener('blur', onWindowBlurCapture, true);
    window.addEventListener('pagehide', onPageHideCapture, true);
    window.addEventListener('pageshow', onPageShowCapture, true);

    info('Visibility interceptor: installed (all vectors covered)');
  }

  // ---------------------------------------------------------------------------
  // Activate / deactivate
  // ---------------------------------------------------------------------------

  /**
   * Enable interception.  Until this is called the getters and event handlers
   * pass through to the original browser behavior.
   */
  function enableVisibilityInterceptor() {
    if (!installed) {
      installVisibilityInterceptor();
    }
    if (active) return;
    active = true;
    info('Visibility interceptor: ACTIVATED — page cannot detect tab-switch or minimization');
    appendLog('离开检测拦截已启用');
  }

  /**
   * Disable interception.  Restores pass-through behavior.
   */
  function disableVisibilityInterceptor() {
    if (!active) return;
    active = false;
    info('Visibility interceptor: DEACTIVATED — pass-through mode');
    appendLog('离开检测拦截已关闭');
  }

  // ---------------------------------------------------------------------------
  // Auto-init: react to settings changes
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to the `disableVisibilityCheck` setting so the interceptor can
   * be toggled at runtime via the UI.  Called once from index.js after settings
   * are loaded.
   */
  function initVisibilityInterceptorSettings() {
    // React to UI toggles (runtime)
    onChange('disableVisibilityCheck', (enabled) => {
      if (enabled) {
        enableVisibilityInterceptor();
      } else {
        disableVisibilityInterceptor();
      }
    });

    // React to persisted setting (initial load)
    const current = getSetting('disableVisibilityCheck', false);
    if (current) {
      enableVisibilityInterceptor();
    }
  }

  /**
   * @file Auto-course processor — course progress monitoring and automatic playback.
   *
   * Responsibilities:
   *   1. Read complete course tree from React component state (all chapters, lessons, status).
   *   2. Monitor video playback progress (always active).
   *   3. Auto-click the play button when autoCourse is enabled.
   *   4. Auto-resume paused videos that have been stuck for too long.
   *
   * Integration points:
   *   - Controlled via the UI settings panel toggle (key: `autoCourse`).
   *   - Emits log messages through ui/builder.js `appendLog()`.
   *   - Course data is read from React Fiber (not parsed from DOM).
   *
   * Expected flow:
   *   Page load → click play → video plays → ends → platform auto-navigates
   *   → face verification popup (handled by processor.js) → next course loads → repeat
   */


  // ---------------------------------------------------------------------------
  // DOM Selectors
  // ---------------------------------------------------------------------------

  const SELECTORS = {
    /** Play button overlay (appears on page load before video starts) */
    PLAY_BTN: '.playIcon___2PP65, .playIcon',
    /** Ant Design collapse container (root of the course directory) */
    COLLAPSE_CONTAINER: '.ant-collapse',
    /** Fallback container: list wrapper (hash class) */
    LIST_CONTAINER: '[class^="list___"]',
    /** Course directory list element for MutationObserver */
    LIST_OBSERVE: '.list___3GtHP, .list',
    /**
     * The sidebar marks the currently-playing lesson with a CSS-module
     * class `playIngName___<hash>`.  We use a prefix match to survive
     * hash changes across platform deployments.
     */
    PLAYING_NAME: '[class*="playIngName"]',
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** @type {boolean} Whether the course monitor is running */
  let running = false;

  /** @type {HTMLVideoElement|null} Cached video element reference */
  let videoEl = null;

  /** @type {MutationObserver|null} Observer for course directory changes */
  let dirObserver = null;

  /** @type {Element|null} The DOM element currently observed by dirObserver */
  let dirObservedEl = null;

  /** @type {number} setTimeout handle for play button retry */
  let playRetryTimer = 0;

  /** @type {number} setTimeout handle for stuck-video check */
  let stuckTimer = 0;

  /** @type {number} How many times we've tried to auto-resume */
  let resumeAttempts = 0;

  /** @type {Array|null} Cached reference to the React state array holding course data */
  let cachedCourseData = null;

  /** Cached DOM container for the React fiber hook (avoids repeated querySelector). */
  let cachedFiberContainer = null;

  /** Cached React fiber key on the container (avoids repeated Object.keys scan). */
  let cachedFiberKey = null;

  /** @type {string|null} Current session ID for progress tracking */
  let currentSessionId = null;

  /** @type {string|null} Current course ID being tracked */
  let currentCourseId = null;

  // ---------------------------------------------------------------------------
  // React Fiber helpers — read course data from component state
  // ---------------------------------------------------------------------------

  /**
   * Find the React Fiber key on a DOM element.
   * Results are cached per element so subsequent scans are O(1).
   * @param {Element} el
   * @returns {string|null}
   */
  function findFiberKey(el) {
    if (cachedFiberContainer === el && cachedFiberKey) return cachedFiberKey;

    cachedFiberKey = Object.keys(el).find(k =>
      k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
    ) || null;

    if (cachedFiberKey) cachedFiberContainer = el;
    return cachedFiberKey;
  }

  /**
   * Check whether a value looks like the course data array we want.
   * The course data is an array of chapter objects, each having `children`
   * (an array of lesson objects), and lessons have `studyRate`, `studyStatus`.
   *
   * @param {*} obj
   * @returns {boolean}
   */
  function isCourseData(obj) {
    if (!Array.isArray(obj) || obj.length === 0) return false;
    // First item should be a chapter: has name, children array, chapterType
    const first = obj[0];
    if (!first || typeof first !== 'object') return false;
    if (first.$$typeof || first.stateNode) return false;              // React internal
    if (typeof first.name !== 'string') return false;
    if (!Array.isArray(first.children)) return false;
    // Check that at least one child has studyRate/studyStatus
    if (first.children.length > 0) {
      const child = first.children[0];
      if (typeof child !== 'object' || child === null) return false;
      return typeof child.studyRate === 'number' && typeof child.studyStatus === 'number';
    }
    // Chapter with no children is still valid if it has chapterType
    return typeof first.chapterType === 'number';
  }

  /**
   * Walk up the React Fiber tree from a DOM element, searching component
   * memoizedState chains for the course data array.
   *
   * @param {Element} container - DOM element to start from
   * @returns {Array|null} The course data array, or null if not found
   */
  function readCourseDataFromReact(container) {
    const fiberKey = findFiberKey(container);
    if (!fiberKey) return null;

    let fiber = container[fiberKey];

    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const val = hook.memoizedState;
        if (val) {
          // Direct match: the hook state IS the course array
          if (isCourseData(val)) return val;

          // Nested match: hook state is an object containing the array
          if (typeof val === 'object' && !Array.isArray(val)) {
            for (const key of Object.keys(val)) {
              if (Object.prototype.hasOwnProperty.call(val, key) && isCourseData(val[key])) {
                return val[key];
              }
            }
          }
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    return null;
  }

  /**
   * Try to find and cache the course data from React state.
   * Returns cached copy if available; re-scans if not found yet.
   * @returns {Array|null}
   */
  function getCourseData() {
    if (cachedCourseData) return cachedCourseData;

    const container = document.querySelector(SELECTORS.COLLAPSE_CONTAINER)
      || document.querySelector(SELECTORS.LIST_CONTAINER);

    if (!container) return null;

    cachedCourseData = readCourseDataFromReact(container);
    if (cachedCourseData) {
      info(`Course: read ${cachedCourseData.length} chapters from React state`);
    }
    return cachedCourseData;
  }

  /**
   * Invalidate the cached course data and fiber references so the next call re-scans.
   */
  function invalidateCourseCache() {
    cachedCourseData = null;
    cachedFiberContainer = null;
    cachedFiberKey = null;
  }

  // ---------------------------------------------------------------------------
  // Progress helpers
  // ---------------------------------------------------------------------------

  /**
   * Read the name of the currently-playing lesson from the sidebar DOM.
   *
   * The platform's sidebar marks the active lesson's name element with a
   * CSS-module class `playIngName___<hash>`.  We use a prefix attribute
   * selector to survive hash changes across platform redeploys.
   *
   * This is more reliable than React `studyStatus` for determining which
   * lesson the user is watching, because `studyStatus` does NOT change
   * from 3 (DONE) back to 2 (IN_PROGRESS) when the user replays a
   * completed lesson — but the sidebar DOM always updates.
   *
   * @returns {string|null} The lesson name text, or null if not found.
   */
  function getPlayingLessonNameFromDOM() {
    const el = document.querySelector(SELECTORS.PLAYING_NAME);
    if (!el) return null;
    const name = (el.textContent || '').trim();
    return name || null;
  }

  /**
   * Resolve chapter progress for a specific chapter identified by the DOM
   * sidebar (rather than by React studyStatus).
   *
   * When the user replays a completed lesson, React keeps its studyStatus
   * at 3, so the `studyStatus=2` heuristic points at a different (stale)
   * chapter.  This helper overrides the chapter selection when the sidebar
   * DOM tells us a different lesson is actually playing.
   *
   * @param {Array} chapters - React course data array
   * @param {string} lessonName - Lesson name from the sidebar DOM
   * @param {Object} result - The result object to mutate
   */
  function applyDOMChapterHint(chapters, lessonName, result) {
    for (const chapter of chapters) {
      if (chapter.chapterType !== 0) continue;
      const lessons = (chapter.children || []).filter(l => l.chapterType === 1);
      const match = lessons.find(l => l.name === lessonName);
      if (match) {
        // Only override if the DOM says we're in a different chapter than
        // what React studyStatus=2 indicates (or if React had no opinion).
        if (chapter.name !== result.currentChapter) {
          result.currentChapter = chapter.name || '';
          result.currentName = match.name || '';
          result.currentPct = Math.round(match.studyRate || 0);
          result.curChapLessons = lessons.length;
          result.curChapDone = lessons.filter(l => l.studyStatus === 3).length;
        }
        return;
      }
    }
  }

  /**
   * Compute progress stats from the React course data.
   *
   * Two-level progress model:
   *   本章 = lessons completed (studyStatus 3) / total lessons in the CURRENT chapter
   *   总   = all lessons completed / all lessons across every chapter
   *
   * In-progress lessons (studyStatus 2) are NOT counted as "done" for either bar
   * — only fully-completed (studyStatus 3) count.
   *
   * Chapter detection uses two sources, in priority order:
   *   1. React `studyStatus === 2` — the canonical "in progress" signal
   *   2. DOM sidebar `playIngName___` class — more reliable when the user
   *      replays a completed lesson (React keeps studyStatus=3).
   *
   * @returns {{
   *   chapterCount: number,
   *   totalLessons: number,
   *   completedLessons: number,
   *   completedChapters: number,
   *   currentChapter: string,
   *   currentName: string,
   *   currentPct: number,
   *   curChapLessons: number,
   *   curChapDone: number,
   *   remainingMinutes: number,
   *   courseId: string,
   *   courseName: string
   * }}
   */
  function parseCourseProgress() {
    const chapters = getCourseData();
    const result = {
      chapterCount: 0,
      totalLessons: 0,
      completedLessons: 0,
      completedChapters: 0,
      currentChapter: '',
      currentName: '',
      currentPct: 0,
      curChapLessons: 0,      // total lessons in the current chapter
      curChapDone: 0,         // completed (studyStatus 3) in the current chapter
      remainingMinutes: 0,
      courseId: '',
      courseName: '',
    };

    // ---- Extract course identification info (MUST run before early return) ----
    // Create a stable course ID from URL pathname.
    // Prioritize extracting numeric course ID from URL (e.g., /course/12345).
    const pathname = window.location.pathname;
    const urlMatch = pathname.match(/\/(?:course|study|learn|class)\/(\d+)/i);
    result.courseId = urlMatch ? `course-${urlMatch[1]}` : pathname;

    // For course name: check if we've already cached a name for this courseId
    // (prevents name drift when document.title changes dynamically).
    const progressData = getProgressData();
    const existingCourse = progressData?.courses?.[result.courseId];
    if (existingCourse && existingCourse.name) {
      result.courseName = existingCourse.name;
    } else {
      // First time seeing this course — extract name from document title
      let title = document.title || '百分网在线学习';
      title = title.replace(/\s*[-–—]\s*(百分网|在线学习|正在学习).*$/, '').trim();

      // Fallback to first chapter name if title cleanup resulted in empty string
      const firstChapterName = (chapters && chapters.length > 0 && chapters[0].chapterType === 0)
        ? chapters[0].name
        : '';
      result.courseName = title || firstChapterName || pathname || '百分网在线学习';
    }

    // ---- Return early if no React data available yet ----
    // courseId and courseName are already populated above, so the session can
    // still be tied to the correct course even before React renders.
    if (!chapters) return result;

    // ---- First pass: compute overall stats, find in-progress lesson ----
    for (const chapter of chapters) {
      if (chapter.chapterType !== 0) continue;

      result.chapterCount++;
      const lessons = (chapter.children || []).filter(l => l.chapterType === 1);

      for (const lesson of lessons) {
        result.totalLessons++;

        if (lesson.studyStatus === 3) {
          result.completedLessons++;
        } else {
          // Unfinished — accumulate remaining time
          const dur = lesson.duration || 0;
          const rate = lesson.studyRate || 0;
          result.remainingMinutes += Math.round(dur * (1 - rate / 100) / 60);
        }

        // Track the first studyStatus=2 lesson as "current"
        if (lesson.studyStatus === 2 && !result.currentName) {
          result.currentChapter = chapter.name || '';
          result.currentName = lesson.name || '';
          result.currentPct = Math.round(lesson.studyRate || 0);
        }
      }
    }

    // ---- Second pass: fill curChapLessons/curChapDone for the current chapter ----
    if (result.currentChapter && chapters.length > 0) {
      const curChap = chapters.find(
        c => c.chapterType === 0 && c.name === result.currentChapter,
      );
      if (curChap) {
        const curLessons = (curChap.children || []).filter(l => l.chapterType === 1);
        result.curChapLessons = curLessons.length;
        result.curChapDone = curLessons.filter(l => l.studyStatus === 3).length;
      }
    }

    // ---- DOM hint: the sidebar's `playIngName___` class reflects which lesson
    //      the user is actually watching.  When the user replays a completed
    //      lesson, React keeps studyStatus=3 on that lesson, so the studyStatus=2
    //      heuristic picks a stale chapter.  The DOM sidebar is always correct.
    const domLessonName = getPlayingLessonNameFromDOM();
    if (domLessonName) {
      applyDOMChapterHint(chapters, domLessonName, result);
    }

    // ---- Third pass: compute completed chapters count ----
    result.completedChapters = chapters.filter(chapter => {
      if (chapter.chapterType !== 0) return false;
      const lessons = (chapter.children || []).filter(l => l.chapterType === 1);
      return lessons.length > 0 && lessons.every(l => l.studyStatus === 3);
    }).length;

    // ---- Fallback: no in-progress lesson found.  Use the first chapter that
    //      still has unfinished lessons as the "current" one. ----
    if (!result.currentName && chapters.length > 0) {
      for (const chapter of chapters) {
        if (chapter.chapterType !== 0) continue;
        const lessons = (chapter.children || []).filter(l => l.chapterType === 1);
        const allDone = lessons.every(l => l.studyStatus === 3);
        if (!allDone && lessons.length > 0) {
          result.currentChapter = chapter.name || '';
          result.currentName = lessons.find(l => l.studyStatus !== 3)?.name || lessons[0].name || '';
          result.curChapLessons = lessons.length;
          result.curChapDone = lessons.filter(l => l.studyStatus === 3).length;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Get current video playback info from the <video> element.
   * @returns {{ currentTime: number, duration: number, progress: number, paused: boolean, ended: boolean }}
   */
  function getVideoInfo() {
    const v = videoEl || document.querySelector('#player_html5_api, #player video');
    if (!v || v.tagName !== 'VIDEO') return { currentTime: 0, duration: 0, progress: 0, paused: true, ended: false };

    const duration = v.duration || 0;
    const currentTime = v.currentTime || 0;
    const progress = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;

    return {
      currentTime,
      duration,
      progress,
      paused: v.paused,
      ended: v.ended,
    };
  }

  // ---------------------------------------------------------------------------
  // Auto-play logic (only runs when autoCourse is ON)
  // ---------------------------------------------------------------------------

  /**
   * Attempt to click the play button.
   * @returns {boolean} true if the button was found and clicked
   */
  function tryClickPlay() {
    const btn = document.querySelector(SELECTORS.PLAY_BTN);
    if (!btn) return false;

    try {
      btn.click();
      info('Course: auto-clicked play button');
      appendLog('已自动开始播放课程视频');
      return true;
    } catch (e) {
      warn('Course: failed to click play button:', e);
      return false;
    }
  }

  /**
   * Start retrying the play button click until success or max retries.
   */
  function startPlayRetry() {
    // Clear any existing timer to prevent orphaned timeouts when re-entered
    // (e.g. if the UI checkbox fires onChange during init while already running)
    if (playRetryTimer) {
      clearTimeout(playRetryTimer);
      playRetryTimer = 0;
    }

    let attempts = 0;
    const maxRetries = COURSE_CONFIG.PLAY_MAX_RETRIES;

    function scheduleNext() {
      if (!running || !getSetting('autoCourse', false)) {
        playRetryTimer = 0;
        return;
      }
      if (videoEl && !videoEl.paused) {
        playRetryTimer = 0;
        return;
      }

      attempts++;
      if (tryClickPlay()) {
        playRetryTimer = 0;
        resumeAttempts = 0;
        return;
      }

      if (attempts >= maxRetries) {
        playRetryTimer = 0;
        debug(`Course: play button not found after ${maxRetries} retries`);
        return;
      }

      // Recursive setTimeout with per-tick jitter — avoids the fixed-interval
      // fingerprint of setInterval.
      playRetryTimer = setTimeout(scheduleNext, jitterMs(COURSE_CONFIG.PLAY_RETRY_DELAY_MS, 0.3));
    }

    // First attempt after initial delay (also jittered)
    playRetryTimer = setTimeout(scheduleNext, jitterMs(COURSE_CONFIG.PLAY_CLICK_DELAY_MS, 0.4));
  }

  // ---------------------------------------------------------------------------
  // Stuck-video detection and auto-resume
  // ---------------------------------------------------------------------------

  /**
   * Schedule a check for stuck video playback.
   * If the video is paused (not ended) for longer than STUCK_THRESHOLD_S, auto-resume.
   */
  function scheduleStuckCheck() {
    clearTimeout(stuckTimer);

    if (!running || !getSetting('autoCourse', false)) return;
    if (!videoEl || videoEl.ended) return;

    stuckTimer = setTimeout(() => {
      if (!running || !getSetting('autoCourse', false)) return;
      if (!videoEl) return;

      if (videoEl.paused && !videoEl.ended) {
        if (resumeAttempts >= COURSE_CONFIG.MAX_RESUME_ATTEMPTS) {
          warn('Course: max resume attempts reached, giving up');
          appendLog('视频自动恢复失败，请手动播放');
          return;
        }

        resumeAttempts++;
        warn(`Course: video stuck, auto-resuming (attempt ${resumeAttempts}/${COURSE_CONFIG.MAX_RESUME_ATTEMPTS})`);
        appendLog(`视频暂停超过 ${COURSE_CONFIG.STUCK_THRESHOLD_S} 秒，自动恢复播放 (${resumeAttempts}/${COURSE_CONFIG.MAX_RESUME_ATTEMPTS})`);

        try {
          videoEl.play();
        } catch (e) {
          warn('Course: auto-resume play() failed:', e);
        }
      }

      // Re-schedule for continuous stuck monitoring
      scheduleStuckCheck();
    }, jitterMsFloor(COURSE_CONFIG.STUCK_THRESHOLD_S * 1000, 0.25));
  }

  // ---------------------------------------------------------------------------
  // UI update helper
  // ---------------------------------------------------------------------------

  /**
   * Push current course progress and video info to the UI.
   * Also updates the current progress tracking session.
   */
  function pushProgress() {
    const courseProgress = parseCourseProgress();
    const videoInfo = getVideoInfo();

    // Detect course transition (SPA navigation to a new course).
    // When the platform auto-navigates to the next course after face
    // verification, reset the no-repeat exclusion so images used in the
    // previous course are eligible again.
    if (currentCourseId && courseProgress.courseId && currentCourseId !== courseProgress.courseId) {
      debug(`Course: transition detected "${currentCourseId}" → "${courseProgress.courseId}" — resetting no-repeat state`);
      resetNoRepeatState();
      currentCourseId = courseProgress.courseId;
    }

    updateCourseProgress({
      ...courseProgress,
      videoProgress: videoInfo.progress,
      videoPaused: videoInfo.paused,
      autoCourseEnabled: getSetting('autoCourse', false),
    });

    // Update progress tracker with current lesson/chapter counts
    if (currentSessionId && courseProgress.totalLessons > 0) {
      updateSession(courseProgress.completedChapters, courseProgress.completedLessons, courseProgress.totalLessons);
    }
  }

  // ---------------------------------------------------------------------------
  // Video event handlers
  // ---------------------------------------------------------------------------

  function onTimeUpdate() {
    if (!videoEl) return;
    pushProgress();
  }

  function onVideoPlay() {
    resumeAttempts = 0;
    scheduleStuckCheck();
    pushProgress();
  }

  function onVideoPause() {
    if (!running) return;
    scheduleStuckCheck();
  }

  function onVideoEnded() {
    clearTimeout(stuckTimer);
    const courseProgress = parseCourseProgress();
    appendLog(`视频播放完成 (${courseProgress.currentName || '当前课程'})`);
    info(`Course: video ended — ${courseProgress.currentName}`);

    updateCourseProgress({
      ...courseProgress,
      videoProgress: 100,
      videoPaused: false,
      autoCourseEnabled: getSetting('autoCourse', false),
    });

    // Re-invalidate cache — platform may navigate to next lesson
    invalidateCourseCache();
  }

  // ---------------------------------------------------------------------------
  // Directory monitoring
  // ---------------------------------------------------------------------------

  /**
   * Start observing the course directory for changes (collapse/expand, navigation).
   * Re-checks React state on mutation (may capture data refreshes).
   */
  function startDirectoryObserver() {
    if (dirObserver) return;

    const listContainer = document.querySelector(SELECTORS.LIST_OBSERVE);
    if (!listContainer) {
      debug('Course: directory container not found, skipping observer');
      return;
    }

    dirObserver = new MutationObserver(() => {
      invalidateCourseCache();
      pushProgress();
    });

    dirObserver.observe(listContainer, { childList: true, subtree: true, attributes: true });
    dirObservedEl = listContainer;
    debug('Course: directory observer started');
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Cache the video element and bind event listeners.
   * Aliplayer wraps the <video> inside #player div; actual element is #player_html5_api.
   *
   * If another element was previously tracked, its listeners are removed first
   * so that orphaned listeners don't prevent GC of detached DOM nodes after
   * SPA navigation.
   *
   * @returns {HTMLVideoElement|null}
   */
  function initVideoMonitor() {
    // If we already have a video element that is still in the DOM, reuse it
    if (videoEl && document.contains(videoEl)) return videoEl;

    // Old element is gone — remove listeners before dropping the reference
    if (videoEl) {
      unbindVideoListeners(videoEl);
      videoEl = null;
    }

    // Try actual video selectors first; fall back to any <video>
    videoEl = document.querySelector('#player_html5_api, #player video, #playerHtml5_api');
    if (!videoEl) {
      debug('Course: video element not found (will retry)');
      return null;
    }

    if (videoEl.tagName !== 'VIDEO') {
      debug('Course: matched element is not <video>, skipping event bind');
      videoEl = null;
      return null;
    }

    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('play', onVideoPlay);
    videoEl.addEventListener('pause', onVideoPause);
    videoEl.addEventListener('ended', onVideoEnded);

    debug('Course: video event listeners bound');
    return videoEl;
  }

  /**
   * Remove bound event listeners from a video element.
   * Called before dropping the reference after SPA navigation replaces the
   * element, so the old (detached) node can be garbage-collected.
   * @param {HTMLVideoElement} el
   */
  function unbindVideoListeners(el) {
    el.removeEventListener('timeupdate', onTimeUpdate);
    el.removeEventListener('play', onVideoPlay);
    el.removeEventListener('pause', onVideoPause);
    el.removeEventListener('ended', onVideoEnded);
    debug('Course: video event listeners unbound');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start the course monitor.
   * Always monitors progress; only auto-plays when autoCourse setting is ON.
   */
  function startCourseMonitor() {
    if (running) return;

    running = true;
    info('Course monitor started');
    appendLog('课程监控已启动');

    // Initialize progress tracking session
    // courseId is always populated from URL pathname, even before React renders
    const courseProgress = parseCourseProgress();
    currentCourseId = courseProgress.courseId;
    const courseName = courseProgress.courseName || '百分网在线学习';
    currentSessionId = startSession(currentCourseId, courseName);

    debug(`Course monitor: tracking session ${currentSessionId} for "${courseName}" (id: ${currentCourseId})`);

    // Bind video events
    initVideoMonitor();

    // Start directory observer
    startDirectoryObserver();

    // Periodic progress update (recursive setTimeout with per-tick jitter —
    // avoids the fixed-interval fingerprint of setInterval).
    function scheduleProgress() {
      if (!running) return;

      // Catch SPA navigation: if video element was replaced, rebind
      if (!videoEl || !document.contains(videoEl)) {
        invalidateCourseCache();
        initVideoMonitor();
      }

      // Catch SPA navigation: if the directory list container was replaced
      // (e.g. after switching courses in the sidebar), the old MutationObserver
      // is silently detached from the DOM and stops firing.  Detect that and
      // re-establish the observer + invalidate the React fiber cache so
      // pushProgress() below re-reads fresh course data.
      if (dirObserver && dirObservedEl && !document.contains(dirObservedEl)) {
        dirObserver.disconnect();
        dirObserver = null;
        dirObservedEl = null;
        invalidateCourseCache();
      }
      // Also handle the case where the observer was never started (e.g. element
      // wasn't present at init but appeared after navigation)
      if (!dirObserver) {
        startDirectoryObserver();
      }

      pushProgress();

      // Schedule next tick with jitter
      setTimeout(scheduleProgress, jitterMs(COURSE_CONFIG.PROGRESS_UPDATE_INTERVAL_MS, 0.2));
    }

    // Kick off the first tick after an initial short delay
    setTimeout(scheduleProgress, jitterMs(COURSE_CONFIG.PROGRESS_UPDATE_INTERVAL_MS, 0.2));

    // Auto-play if enabled
    if (getSetting('autoCourse', false)) {
      startPlayRetry();
      setStatus(true, '运行中 — 自动刷课已启用');
    }

    // Initial progress push
    pushProgress();
  }

  // ---------------------------------------------------------------------------
  // Settings listener — react to toggle changes from the UI panel
  // ---------------------------------------------------------------------------

  onChange('autoCourse', (enabled) => {
    if (enabled) {
      if (!running) {
        startCourseMonitor();
      } else {
        startPlayRetry();
        setStatus(true, '运行中 — 自动刷课已启用');
        appendLog('自动刷课已启用');
      }
    } else {
      if (running) {
        clearTimeout(playRetryTimer);
        playRetryTimer = 0;
        clearTimeout(stuckTimer);
        stuckTimer = 0;
        resumeAttempts = 0;

        setStatus(true, '运行中 — 课程监控 (自动刷课已关闭)');
        appendLog('自动刷课已关闭 — 仅监控进度');
      }
    }
  });

  /**
   * @file Main entry point for baifenwang-auto-study userscript.
   * Bootstraps interceptors, auto-processor, UI, and image pool.
   */


  /**
   * Initialize the userscript.
   * Interceptors are installed immediately (run-at: document-start).
   * UI, auto-processor, and image pool are deferred until DOM is ready.
   *
   * Each subsystem is wrapped in try-catch so one failure doesn't block
   * the rest.  Errors are surfaced in both the console and the UI log panel
   * (once the UI is mounted).
   */
  function bootstrap() {
    info(`${SCRIPT_NAME} v${SCRIPT_VERSION} starting…`);

    // ---- Phase 1: install interceptors immediately (before page scripts run) ----

    try { installVideoInterceptor(); } catch (e) {
      error('Video interceptor install failed:', e);
    }

    try { initVideoOverlay(); } catch (e) {
      error('Video overlay init failed:', e);
    }

    try { installVisibilityInterceptor(); } catch (e) {
      error('Visibility interceptor install failed:', e);
    }

    // ---- Phase 2: DOM-dependent components (deferred to ready) ----

    async function mountUI() {
      let uiReady = false;
      const fail = (msg) => {
        warn(msg);
        if (uiReady) appendLog(msg);
        else setTimeout(() => appendLog(msg), 0); // queue for after UI is built
      };

      // 2a. Persisted settings
      try {
        await loadSettings();
      } catch (e) {
        fail(`Settings load failed: ${e?.message || e}`);
        error('Settings load failed:', e);
      }

      // 2a1. Progress tracker (learning history)
      try {
        await loadProgressTracker();
        debug('Progress tracker loaded successfully');
      } catch (e) {
        // Non-fatal — stats panel will show empty data if this fails
        warn('Progress tracker init failed (non-fatal):', e);
      }

      // 2a2. Visibility interceptor — must run after settings load
      try {
        initVisibilityInterceptorSettings();
      } catch (e) {
        debug('Visibility interceptor init failed:', e);
      }

      // 2b. Image pool
      try {
        await initPool();
      } catch (e) {
        fail(`Image pool init failed: ${e?.message || e}`);
        error('Image pool init failed:', e);
        // Non-fatal — the pool will stay empty and the interceptor will fall
        // back to the real camera when it can't pick an image.
      }

      // 2c. Build UI panel (must succeed — otherwise we can't show any feedback)
      try {
        buildUI();
        uiReady = true;
        appendLog('UI面板已挂载');
      } catch (e) {
        error('UI build failed — no panel visible:', e);
        // Can't show UI — log to console only.  Interceptors are already
        // installed so the core bypass still works silently.
        return;
      }

      // 2d. Auto-processor
      try {
        startAutoProcessor();
      } catch (e) {
        appendLog(`人脸验证处理器启动失败: ${e?.message || e}`);
        error('Auto-processor start failed:', e);
      }

      // 2e. Course monitor
      try {
        startCourseMonitor();
      } catch (e) {
        appendLog(`课程监控启动失败: ${e?.message || e}`);
        error('Course monitor start failed:', e);
      }

      appendLog('所有系统就绪');
      info('Initialization complete');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountUI);
    } else {
      mountUI();
    }

    // ---- Phase 3: register cleanup hooks for session tracking ----

    // End active session when user leaves/refreshes the page.
    // Uses synchronous localStorage flush because beforeunload does not wait
    // for async work — the page may tear down before endSession() completes.
    window.addEventListener('beforeunload', () => {
      try {
        flushSessionSync();
      } catch (e) {
        // Swallow errors in beforeunload to avoid blocking navigation
        error('Failed to flush session on page unload:', e);
      }
    });
  }

  bootstrap();

})(JSZip);
