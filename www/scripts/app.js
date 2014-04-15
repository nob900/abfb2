require(['uitouch', 'dict', 'options', 'book', 'stuff', 'sound', 'sharedc', 'require', 'images', 'hammer'],
function(uitouch, dict, options, book, stuff, sound, sharedc, require){
    var ws = null;
    var dreq = null;
    var timer = null;
    var sxG = 0;
    var syG = 0;
    var reb = /k\>/g;
    var retr = /\<\/?tr\>/g;
    var ren = /[\f\n\r\v]{3}/g;
    var moveflag = 0;
    var dtext = null;
    var txarea = document.getElementById('txtarea');
    var mtext = document.getElementById('maintext');
    var fl_text = document.getElementById('fl_text');
    var ta_rectObject = txarea.getBoundingClientRect();
    var hammer = require('hammer');
    txarea.style.height = (window.innerHeight - ta_rectObject.top + 1)+"px";
    txarea.style.width = window.innerWidth+"px";
    fl_text.style.width =  "auto";
    var sndcnt = document.getElementById('sndcnt');
    var sndbt = document.getElementById('sndbt');
    var nosnd = document.getElementById('nosnd');
    var pts = document.getElementById("pts");
    var pop = document.getElementById("pop");
    var helper = document.getElementById("helper");
    mtext.style.top = "0px";
    txarea.style.backgroundSize = '100%';
    helper.style.height = window.innerHeight+"px";
    helper.style.width = window.innerWidth+"px";
    if ( window.cordova ) {
        var images = require("images");
        if(window.innerWidth<512) txarea.style.backgroundImage = 'url('+images.img_tiny+')';
        else if (window.innerWidth<1024) txarea.style.backgroundImage = 'url('+images.img_small+')';
        else txarea.style.backgroundImage = 'url('+images.img+')';
    } else {
        if(window.innerWidth<512) txarea.style.backgroundImage='url(../images/back_tiny.jpg)';
        else if (window.innerWidth<1024) txarea.style.backgroundImage='url(../images/back_small.jpg)';
        else txarea.style.backgroundImage='url(../images/back.jpg)';
    }
    var drvhds = parseInt(Math.min(Math.floor(window.innerHeight), Math.floor(window.innerWidth))/3);
    function chkmv(evt){
        evt.gesture.preventDefault();
        console.log(evt.gesture.distance+" vs "+drvhds);//NFP
        if(drvhds<evt.gesture.distance){
            evt.gesture.stopDetect();
            return true;
        }
        return false;
    }
    var dragopts = {"drag_min_distance": drvhds, "swipe_velocity":0.2};
    hammer(txarea, dragopts).on("dragleft swipeleft", function(evt){if(chkmv(evt)){uitouch.liftcol(mtext, -1); pop.style.display='none';}});
    hammer(txarea, dragopts).on("dragright swiperight", function(evt){if(chkmv(evt)){uitouch.liftcol(mtext, 1); pop.style.display='none';}});
    hammer(txarea, dragopts).on("dragup swipeup", function(evt){if(chkmv(evt)){options.display('hide'); pop.style.display='none';}});
    hammer(txarea, dragopts).on("dragdown swipedown", function(evt){if(chkmv(evt)){options.display('show'); pop.style.display='none';}});
    hammer(txarea).on("doubletap", function(evt){helper.style.display="block";});
    hammer(txarea).on("dblclick",  function(evt){helper.style.display="block";});
    hammer(mtext).on("pinchin", function(evt){uitouch.doscale(evt.gesture.scale);});
    hammer(mtext).on("pinchout", function(evt){uitouch.doscale(evt.gesture.scale);});
    hammer(pop).on("dragleft",  function(evt){if(chkmv(evt)){uitouch.liftcol(pts,-1);}});
    hammer(pop).on("dragright", function(evt){if(chkmv(evt)){uitouch.liftcol(pts, 1);}});
    hammer(pop).on("dragup",   function(evt){uitouch.dragpop(evt.gesture.center.pageY);});
    hammer(pop).on("dragdown", function(evt){uitouch.dragpop(evt.gesture.center.pageY);});
    mtext.addEventListener("click", function(e){uitouch.handleClick(e);}, false);
    mtext.addEventListener("select", function(e){uitouch.handleSelect(e);}, false);
    hammer(helper).on("tap pinchin pinchout dragleft dragright dragup dragdown", function(evt){helper.style.display="none";});
    helper.addEventListener("click", function(e){helper.style.display="none";}, false);
    window.addEventListener("keydown", function(e){uitouch.handleKey(e);}, false);
    window.addEventListener("pinch", function(e){console.log("Pinch supported");}, false);
    //window.addEventListener("", function(e){uitouch.handlegest(e);}, false);
    var opt_bl = document.getElementById("options_block");
    try { window.addEventListener("beforeunload", function(){ console.log("saving.."); options.savepp();});}
    catch (e) { chrome.app.window.current().onClosed.addListener(function(){console.log("saving.."); options.savepp();});}
    sharedc.register('uitouch', 'got_selection', function (texts) { thumb_block(uitouch.max_Y(), texts, 'block'); });
    sharedc.register('uitouch', 'next_chapter', function (i) {
            var diff = parseInt(i);
            //mtext.innerHTML='wait..';
            options.display("show");
            book.foliant().next_page(diff);
        });
    sharedc.register('dict', 'got_def', function (txt, els) {
        dict.push_cache(txt);
        if(txt.length>1) fill_thumb(txt, els);
        else fill_thumb("Something went wrong. Please check your options.");
    });
    sharedc.register('bookng', 'got_toc', function(){console.log("Got toc"); fill_toc(book.get_page(-1)); uitouch.init_scale();});
    sharedc.register('book', 'got_book', function(){console.log("Got book"); uitouch.init_scale();});
    sharedc.register('options', 'got_file', function(){
            options.remove_old();
            options.display("hide");
            book.init(options.bookfile());
            book.load();
        });
    sharedc.register('bookng', 'got_fstfile', function(data, prc){
        if(data){
            if(prc) var percent = prc;
            else var percent = options.getpercent();
            fill_page(data, percent, false); 
            var sel = document.getElementById("tocselect");
            var newsel = book.foliant().option(sel.selectedIndex);
            if(sel.options[newsel]) sel.options[newsel].selected = true;
            options.display("hide");
        }
    });    
    sharedc.register('options', 'got_pp', function () {
                                                var i = options.getpage();
                                                var prc = options.getpercent();
                                                book.foliant().get_fromopt(i, prc);
                                            });
    
    function fill_toc(html){
        var opts = document.getElementById("options_block");
        var toc = document.getElementById("toc");
        var dtoc = toc.parentNode;
        dtoc.removeChild(toc)
        var ntoc = document.createElement("div");
        ntoc.id = "toc";
        ntoc.appendChild(html);
        dtoc.appendChild(ntoc);
        var sel = document.getElementById("tocselect");
        sel.style.width = Math.min(parseInt(window.innerWidth)-24, parseInt(stuff.getStyle(sel, 'width')))+"px";
        sel.addEventListener("change", function (event){mtext.style.top="0px"; 
                                                book.foliant().get_fromopt(event.target.selectedIndex, 0.00000000000000001);} );
        options.getpp();
    }
    function prc_from_anchor(anchor, prc){
        var ancel = document.getElementById(anchor);
        if(!ancel) return prc;
        var antop = parseFloat(stuff.getStyle(ancel, 'top'));
        var cheight = parseFloat(stuff.getStyle(mtext, 'height'));
        return 100.0*antop/cheight;
    }
    function fill_page(data, percent, nosave){
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = 'img { max-height: '+parseInt(window.innerHeight-64)+'px; max-width:'+parseInt(window.innerWidth-64)+'px; overflow:hidden}';
        document.getElementsByTagName('head')[0].appendChild(style);
        if(data[0]) mtext.innerHTML = data[0];
        mtext.style.width = 'auto';
        mtext.style.height = 'auto';
        mtext.style.display = 'block';
        var fs = parseInt(stuff.getStyle(mtext, 'font-size'));
        var cheight = mtext.scrollHeight;//stuff.getStyle(mtext, 'height');
        if(!nosave) {
            options.setpage(book.foliant().currentpage());
        }
        if(data[1]) percent = prc_from_anchor(data[1], percent);
        else if(percent==='end') percent = 100.0*parseFloat(cheight-window.innerHeight/2)/cheight;
        mtext.style.top = parseInt(-percent*parseFloat(cheight)/100.0)+"px";
        if(!nosave) {
            options.setpercent(percent);
            console.log("saving..");  options.savepp();
        }
        return mtext;
    }
    function fill_thumb(text, els){
        if(text.length > 1){
            var cl = document.getElementById('pts');
            var el = document.getElementById('pop');
            var cf = 0.1;
            var width = parseInt(el.style.width, 10);
            dtext = text.replace(reb, "strong>").replace(retr, "/").replace(ren, "<br>").replace(/220[\s\S.]+?\s\d\d\d\s/, '');//.replace(/<.*>\n/, '');
            cl.innerHTML = dtext;
            sndbt.appendChild(sndcnt);
            cl.appendChild(sndbt);
            cl.appendChild(nosnd);
            el.style.display = 'block';
            if(els && els.length){
                for(var i = 0; i<els.length; i++){
                    cl.appendChild(document.createElement("br"));
                    cl.appendChild(els[i]);
                }
            }
            sndbt.style.display = 'block';
            uitouch.dragpop(-1);
            sndbt.style.display = 'none';
            sound.get_sound(dict.lword(), dict.lang());
        } else {el.style.display = 'none';}
    }
    function thumb_block(mY, texts, disp) {
        var el = document.getElementById('pop');
        var cl = document.getElementById('pts');
        cl.innerHTML = "Sending request..";
        console.log("Got texts:");//NFP
        console.log(texts);//NFP
        var pos = 0;
        if(el){
            if(disp!='none'){
                var config = options.config();
                var ptop = parseInt(txarea.style.height);
                if(mY < ptop/2) pos = 'bot';
                else pos = 'top';
                cl.style.top = "0px";
                if(pos==='top'){
                      el.style.top = 0+"px"; el.style.bottom = '99%';
                    }
                if(pos==='bot'){el.style.bottom = 0+"px"; el.style.top = '99%';}// dt.style.display='none'; db.style.display=disp;}
                    dict.get_def(texts);
            } else {el.style.display = disp;}
        }
    }
});
