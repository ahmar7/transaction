// -- transactions --

var txType = 'txBCI';
var defaultFee = 0.00002;
function txGetUnspent()
{
    var addr = rush.address;
    var url = 'https://blockchain.info/unspent?cors=true&active=' + addr;
    //url = prompt('Press OK to download transaction history:', url);
    if (url != null && url != "")
    {
        rush.txUnspent = '';
        ajax(url, txParseUnspent);
    }
    else
    {
        txSetUnspent(rush.txUnspent);
    }
}

function txSetUnspent(text)
{
    var r = JSON.parse(text);
    txUnspent = JSON.stringify(r, null, 4);
    rush.txUnspent = txUnspent;
    var address = rush.address;
    TX.parseInputs(txUnspent, address);
    var value = TX.getBalance();
    var fval = value / 100000000;
    var fee = parseFloat(rush.txFeePerKb);

    rush.balance = fval;

    bigfVal = btcstr2bignum( fval.toString() );
    bigFee = btcstr2bignum( fee.toString() );

    bigValue = bigfVal.subtract( bigFee );

    // rush.txValue = fval - fee;

    rush.txValue = bigValue / 100000000;
    rush.txValue = rush.txValue.toFixed(8);

    txRebuild();
}

function txParseUnspent(text)
{
    if (text == '')
        setMsg('No data');
    else
        txSetUnspent(text);
}

function txOnAddDest()
{
    var list = $(document).find('.txCC');
    var clone = list.last().clone();

    clone.find('.help-inline').empty();
    clone.find('.control-label').text('Cc');

    var dest = clone.find('#txDest');
    var value = clone.find('#txValue');
    clone.insertAfter(list.last());

    onInput(dest, txOnChangeDest);
    onInput(value, txOnChangeDest);

    dest.val('');
    value.val('');

    $('#txRemoveDest').attr('disabled', false);

    return false;
}

function txOnRemoveDest()
{
    var list = $(document).find('.txCC');

    if (list.size() == 2)
        $('#txRemoveDest').attr('disabled', true);

    list.last().remove();

    return false;
}

function txSent(text)
{
    //setMsg(text ? text : 'No response!');
    if (/error/.test(text))
    {
        if (rush.counter < 3)
        {
            //     setTimeout(function () {
            //         txSend()
            //     }, 200);
            //     rush.counter++;
        }
        else
        {
            rush.counter = 0;
            setMsg("There seems to be a problem with building the transaction. This in no way affects the safety of your Bitcoins.")
            rush.txSec = "";
        }
    }
    else
    {
        rush.txComplete();
    }
}

function txSend()
{
    var txAddr = rush.address;
    var address = TX.getAddress();
    var r = '';

    if (txAddr != address)
        r += 'Warning! Source address does not match private key.\n\n';

    var tx = rush.txHex;

    //console.log('TX size:', tx.length / 2.0);
    url = 'https://blockchain.info/pushtx?cors=true';

    postdata = 'tx=' + tx;

    //url = prompt(r + 'Send transaction:', url);

    if (url != null && url != "")

    {
    //console.log('do not send for debugging', postdata);
        ajax(url, txSent, postdata);
    }

    return false;
}

function txRebuild()
{
    var sec = rush.txSec;
    var addr = rush.address;
    var unspent = rush.txUnspent;
    var balance = parseFloat(rush.balance);
    var feePerKb = parseFloat(rush.txFeePerKb);

    try
    {
        var res = Bitcoin.base58.checkDecode(sec);
        var version = res.version;
        var payload = res.slice(0);
    }
    catch (err)
    {
        rush.txJSON = "";
        rush.txHex = "";
        return;
    }

    var compressed = false;
    if (payload.length > 32)
    {
        payload.pop();
        compressed = true;
    }

    var eckey = new Bitcoin.Key(payload);

    eckey.setCompressed(compressed);

    TX.init(eckey);

    var fval = 0;
    var o = txGetOutputs();

    for (i in o)
    {
        TX.addOutput(o[i].dest, o[i].fval);
        fval += o[i].fval;
    }

    bigBalance = btcstr2bignum( balance.toString() );
    bigFee = btcstr2bignum((feePerKb * estimateTxKb()).toString());
    bigfVal = btcstr2bignum( fval.toString() );

    // send change back or it will be sent as fee

    // if (balance > fval + fee)

    if ((bigBalance/1) > (bigfVal.add(bigFee)/1) )
    {

        var bigChange = bigBalance.subtract(bigfVal).subtract(bigFee); 

        // console.log( "subtracting " + (bigBalance/1) + " - " + (bigfVal/1) + " - " + (bigFee/1) + " = " + (bigChange/1) );
        // var change = balance - fval - fee;

        // @TODO: If less than dust limit, do not add any change output
        // see: https://github.com/bitcoin/bitcoin/blob/9fa54a1b0c1ae1b12c292d5cb3158c58c975eb24/src/primitives/transaction.h#L138

        if (bigChange > bitcoin2.networks.bitcoin.dustThreshold) {
            change = bigChange / 100000000;
            TX.addOutput(addr, change);
        }
    }

    try
    {
        var sendTx = TX.construct();
        var txJSON = TX.toBBE(sendTx);

        //var buf = sendTx.serialize();

        rush.txJSON = txJSON;
        rush.txHex = sendTx._fixedTx.build().toHex();

        console.log(rush._txHex);

        var size = rush.txHex / 2;
        var targetTransactionFee = Math.ceil(size / 1024) * 10000;

        if  (targetTransactionFee > bigFee) {
            setMsg('Due to the requirements of the Bitcoin network, you need to set a higher fee to broadcast this transaction properly.' +  
                'Open your preferences to set the mining fee (required fee : '+targetTransactionFee+'). ');

            rush.txJSON = "";
            rush.txHex = "";
        }
    }
    catch (err)
    {
        console.log('There was an error sending:', err);
        rush.txJSON = "";
        rush.txHex = "";
    }

    txSend();
}

function txOnChangeDest()
{
    var balance = parseFloat(rush.balance);
    var fval = parseFloat(rush.txValue);
    var fee = parseFloat(rush.txFeePerKb);

    if (fval + fee > balance)
    {
        fee = balance - fval;
        rush.txFeePerKb = (fee > 0) ? fee : '0.00';
    }

    clearTimeout(timeout);

    //timeout = setTimeout(txRebuild, TIMEOUT);
}

// function txOnChangeFee() {
//     var balance = parseFloat($('#txBalance').val());
//     var fee = parseFloat('0'+$('#txFee').val());
//     var fval = 0;
//     var o = txGetOutputs();
//     for (i in o) {
//         TX.addOutput(o[i].dest, o[i].fval);
//         fval += o[i].fval;
//     }

//     if (fval + fee > balance) {
//         fval = balance - fee;
//         $('#txValue').val(fval < 0 ? 0 : fval);
//     }

//     if (fee == 0 && fval == balance - 0.00002) {
//         $('#txValue').val(balance);
//     }

//     clearTimeout(timeout);
//     timeout = setTimeout(txRebuild, TIMEOUT);
// }

function txGetOutputs()
{
    var res = [];

    // $.each($(document).find('.txCC'), function() {
    //     var dest = rush.txDest;
    //     var fval = parseFloat('0' + $(this).find('#txValue').val());
    //     res.push( {"dest":dest, "fval":fval } );
    // });

    var dest = rush.txDest;
    var fval = parseFloat(rush.txAmount);
    res.push(
    {
        "dest": dest,
        "fval": fval
    });

    return res;
}

var entroMouse = window.entroMouse = {
    "generating": false,
    "chars": "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "max": 30,
    "count": 0,
    "string": "",
    "lockHeight": 0,
    "mouseInside": false,
    "start": function ()
    {
        var ua = navigator.userAgent.toLowerCase();
        this.generating = true;
        entroMouse.count = 0;
        $(".ripples").hide();
        $("#progressLockBox").css("display", "inline-block");
        if (mobilecheck())
        {
            $("#qrInstall").show();
            if( /Android/i.test(navigator.userAgent) ) 
            {
                $("#qrInstallIcon a img").attr("src", "img/droid.png");
                $("#storeName").html("Google Play Store")
                $("#qrInstallIcon a").attr("href", "https://play.google.com/store/apps/details?id=com.google.zxing.client.android&hl=en");
                $("#qrInstallInfo a").attr("href", "https://play.google.com/store/apps/details?id=com.google.zxing.client.android&hl=en");
            }

            // $(document).on("click", '#tapBox', function (event)
            // {
            //     entroMouse.mmove(event);
            //     var x = event.pageX,
            //     y = event.pageY;
            //     //$('.tap').remove();
            //     tapDiv = $('<div>');
            //     tapDiv.addClass("tap").css({left: x,top: y }).appendTo("body").fadeOut(800);
            //     tapDiv.append( "<div class='tap2'><div class='tap3'></div><div>" );
            // });

            document.addEventListener('touchmove', function (e)
            {
                // e.preventDefault();

                if (e.target.className == "tapBox" || e.target.className == "ripple ripple-3")
                {
                    event.preventDefault()
                    var x = e.touches[0].pageX,
                    y = e.touches[0].pageY;

                    // $('.tap').remove();
                    // time = new Date().getTime();
                    // if ( time % 5 == 1 )
                    // {
                    //     tapDiv = $('<div>');
                    //     tapDiv.addClass("tap").css({left: x,top: y }).appendTo("body").fadeOut(1000);
                    //     // tapDiv.append( "<div class='tap2'><div class='tap3'></div><div>" );
                    // }

                    var touch = e.touches[0];
                    entroMouse.mmove(touch);
                }
            }, false);
        }
        else
        {
            document.onmousemove = this.mmove;
            $("#leadTxt").html( "Move your mouse randomly inside the box until your new Bitcoin wallet appears" );
        }
    },

    "mmove": function (ns)
    {
        if (entroMouse.generating)
        {
            if ( !entroMouse.mouseInside && !mobilecheck() )
            {
                return false;
            }

            X = ns.pageX;
            Y = ns.pageY;

            if (ns.target.className == "tapBox" || ns.target.className == "ripple ripple-3")
            {
                time = new Date().getTime();
                if ( time % 5 == 1 )
                {
                    tapDiv = $('<div>');
                    tapDiv.addClass("tap").css({left: X,top: Y }).appendTo("body").fadeOut(1000);

                    // tapDiv.append( "<div class='tap2'><div class='tap3'></div><div>" );
                }
            }

            $("#progressFill").css(
            {
                "height": (entroMouse.lockHeight+=.5 ) + "px"
            });

            time = new Date().getTime();
            var num = (Math.pow(X, 3) + Math.pow(Y, 3) + Math.floor(time * 1000) + Math.floor(Math.random() * 1000)) % 62;

            entroMouse.count++;

            if ( entroMouse.count % 10 == 1 )
            {
                if (entroMouse.max--)
                {
                    entroMouse.string += entroMouse.chars.charAt(num % entroMouse.chars.length);
                    $("#code").html(entroMouse.string);

                    // if ( !mobilecheck() )
                    // {

                        location.replace("#"+entroMouse.string);

                    // }

                    percent = ((30 - entroMouse.max) / 30) * 100;
                    entroMouse.lockHeight = (percent * 157) / 100;

                    $(".ripples").hide();
                    $("#progressLockBox").css("display", "inline-block");
                    $("#progress").css("width", percent + "%");
                    $("#progressFill").css(
                    {
                        "height": entroMouse.lockHeight + "px"
                    });

                    rush.firstTime = true;
                }
                else
                {
                    entroMouse.generating = false;
                    if ( $(".KKCheck").attr("active") == "true" )
                    {
                        $("#tapBox, #passwordCheckBox, #passBox").hide();
                        $("#createPassword").show();
                        $("#leadTxt").html("Enter a password to encrypt this wallet <span class='glyphicon glyphicon-question-sign' id='passwordInfo'></span>");
                        $("#createPasswordTxt").focus();
                    }
                    else
                    {
                        var bytes = Bitcoin.Crypto.SHA256(entroMouse.string,
                        {
                            asBytes: true
                        });

                        location.replace("#" + entroMouse.string);
                        var btcKey = new Bitcoin.Key(bytes);
                        var address = btcKey.getBitcoinAddress().toString();
                        rush.passcode = entroMouse.string;
                        rush.address = address;
                        rush.firstTime = true;
                        rush.open();
                    }
                }
            }
        }
    }
}

function randomstring ()
{
    var text = "";
    for (var i=0; i < 30; i++) text += entroMouse.chars.charAt(Math.floor(Math.random() * entroMouse.chars.length));
    return text;
}

function mobilecheck ()
{
    //return true;

    //dmn
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) 
        return true;
    else
        return false;
}

$(document).ready(function ()
{
    $.fn.redraw = function(){
      $(this).each(function(){
        var redraw = this.offsetHeight;
      });
    };

    $("#qrvidBox").hide();      //dmn ---- this is a crappy hack

    if ( mobilecheck() )
    {
        $(".banner").css({position:"absolute"});
    }
    else
    {
        //DMN
        //$("#qrscan").parent().parent().hide();
    }
    // //Ripple Fade
    // var ripple = $('#tapGif');
    // function runIt()
    // {
    //     ripple.animate(
    //     {
    //         opacity: '1'
    //     }, 2000);
    //     ripple.animate(
    //     {
    //         opacity: '0.1'
    //     }, 2000, runIt);
    // }
    // runIt();
    // //End Fade

    $("#invoicesBody td:nth-child(4) a").tooltip();
    $(window).on('beforeunload', function ()
    {
        return 'Make sure you save your URL in order to access your wallet at a later time.';

    });

    $(document).on("click", '#sendBtn', function (event)
    {
        if (!rush.check())
        {
            return;
        }

        $("#confirmModal").modal("show");

        if ( rush.useFiat )
        {
            var btcValue = parseFloat($("#txtAmount").val()) / rush.price;
            btcValue = btcFormat( btcValue );
            txAmount = btcValue;
        }
        else
        {
            txAmount = parseFloat($("#txtAmount").val());
            txAmount = btcFormat( txAmount );
        }

        //$("#txFee").html( rush.txFeePerKb );

        $("#confirmAmount").html( txAmount );
        $("#confirmAddress").html( $("#txtAddress").val() );

        if (rush.checkAddress($("#txtAddress").val())) $('#recipientType').text("Bitcoin address");
        else if (rush.checkEmail($("#txtAddress").val())) $('#recipientType').text("email address");
        else if (rush.checkTwitter($("#txtAddress").val())) $('#recipientType').text("Twitter handle");
        // rush.send();
    }); 

    $(document).on("click", '#confirmSend', function (event)
    {
        if (rush.checkTwitter( $('#txtAddress').val() ) && !confirm("Are you sure you want to send BTC to this Twitter handle? The recipient of the Bitcoin must be following you to get your direct message.")) return;
        rush.send();

        $("#confirmModal").modal("hide");
    }); 

    $(document).on("click", '#passwordInfo', function (event)
    {
        $("#passwordInfoModal").modal("show");
    }); 

    $(document).on("click", '#settings', function (event)
    {
        if ( !rush.passcode )
            return;

        $("#defaultFeePlaceholder").text(defaultFee);
        $("#settingsChoices,#btnNewRequest").show();
        $("#settingsTitle .glyphicon, #settingsCurrency, #settingsMining, #settingsExport, #settingsSweep, #settingsInvoice, #requestForm, #importRequestBox").hide();
        $("#settingsTitleText").html( "Settings" );
        $("#settingsModal").modal("show");
        $("#currencySelect").html("");
        $("#chartBox").slideUp();

        for ( i in rush.currencyOptions )
        {
            $("#currencySelect").append( "<option value='" + rush.currencyOptions[i] + "'>" + rush.currencyOptions[i] + "</option>" );
        }

        $("#currencySelect").val( rush.currency );
    }); 

    $(document).on("click", '.closeModal, .closeConfirm', function (event)
    {
        $("#request, #infoModal, #confirmModal, #passwordInfoModal, #settingsModal").modal("hide");
    });  

    $(document).on("change", '#currencySelect', function (event)
    {
        rush.currency = $(this).val();
        rush.getFiatPrice();

        if ( rush.useFiat )
        {
            $(".addonBox").html( rush.getFiatPrefix() );
        }

        if ( rush.useFiat2 )
        {
            $(".addonBox2").html( rush.getFiatPrefix() );
        }

        setCookie("currency", rush.currency, 100);
    });  

    $(document).on("click", '#qrInstallX', function (event)
    {
        $("#qrInstall").slideUp();
    }); 

    $(document).on("click", '#generateBtn', function (event)
    {

    });

    // $(document).on("click", '#passBtn', function (event)
    // {
    //     icon = $(this).find(".glyphicon");
    //     if ( icon.hasClass("glyphicon-unchecked") )
    //     {
    //         icon.removeClass("glyphicon-unchecked").addClass("glyphicon-check");
    //     }
    //     else
    //     {
    //         icon.removeClass("glyphicon-check").addClass("glyphicon-unchecked");
    //     }
    // });

    //DMN
    $(document).on("click", '#qrscan', function (event)
    {
        //$("#walletInfo").slideUp(); 
        $("#qrvidBox").slideDown();
        //decodeCode();
        $(window).off('beforeunload');
    });    

    $(document).on("click", '#passBoxTxt', function (event)
    {
        if ( $(".KKCheck").attr("active") != "true" )
        {
            $(".KKCheckInner").addClass("checkGreen");   
            $("#checkIcon").fadeIn();  
            $(".KKCheck").attr("active","true");
        }
        else
        {
            $(".KKCheckInner").removeClass("checkGreen");   
            $("#checkIcon").fadeOut();  
            $(".KKCheck").attr("active","false");
        }
    });

    $(document).on("keypress", '#openPasswordTxt', function (e)
    {
        var p = e.keyCode;
        if (p == 13)
        {
            $("#openWallet").trigger("click");
        }
    });  

    $(document).on("keypress", '#createPasswordTxt', function (e)
    {
        var p = e.keyCode;
        if (p == 13)
        {
            $(this).parent().find("button").trigger("click");
            // $("#openWallet").trigger("click");
        }
    });   

    $(document).on("mouseover", '#tapBox', function (e)
    {
        entroMouse.mouseInside = true;
    }); 

    $(document).on("click", '#changeType', function (e)
    {
        if ( $("#changeType .addonBox").html() != "???" )
        {
            $("#changeType .addonBox").html("???");
            rush.useFiat = false;
            rush.amountFiatValue();
            if ( !mobilecheck() )
                $("#txtAmount").focus();
        }
        else
        {
            $("#changeType .addonBox").html( rush.getFiatPrefix() );
            rush.useFiat = true;
            rush.amountFiatValue();
            if ( !mobilecheck() )
                $("#txtAmount").focus();
        }
    }); 

    $(document).on("click", '#changeType2', function (e)
    {
        if ( $("#changeType2 .addonBox2").html() != "???" )
        {
            $("#changeType2 .addonBox2").html("???");
            rush.useFiat2 = false;
            rush.amountFiatValue2();

            if ( !mobilecheck() )
                $("#txtReceiveAmount").focus();
        }
        else
        {
            $("#changeType2 .addonBox2").html(rush.getFiatPrefix());
            rush.useFiat2 = true;
            rush.amountFiatValue2();
            if ( !mobilecheck() )
                $("#txtReceiveAmount").focus();
        }
    });

    $(document).on("mouseleave", '#tapBox', function (e)
    {
        entroMouse.mouseInside = false;
    });

    $(document).on("click", '#info', function (e)
    {
        $("#infoModal").modal("show");
    }); 

    $(document).on("click", '.openInvoice', function (e)
    {
        num = $(this).attr("invoiceNum");
        invoices = localStorage.invoices;
        invoices = JSON.parse( invoices );
        invoice = invoices[num];
        delete invoice.myAddress;
        urlHash =  btoa( encodeURIComponent( JSON.stringify(invoices[num]) ));
        window.open("http://bitcoin-wallets.org/request/#" + urlHash,'_blank');
    }); 

    $(document).on("click", '.deleteInvoice', function (e)
    {
        if ( confirm("Are you sure you want to delete this "+ getTypeName( $("#invoiceType").val() ) +"?") )
        {
            num = $(this).attr("invoiceNum");
            invoices = localStorage.invoices;
            invoices = JSON.parse( invoices );
            type = invoices[num].type;
            invoices.splice( num, 1 );
            localStorage.invoices = JSON.stringify( invoices );
            rush.updateInvoices( type );
        }
    }); 

    $(document).on("click", '.sweepInvoice', function (e)
    {
        if ( confirm("Are you sure you want to sweep this "+ getTypeName( $("#invoiceType").val() ) +"?") )
        {
            num = $(this).attr("invoiceNum");
            invoices = localStorage.invoices;
            invoices = JSON.parse( invoices );
            invoice = invoices[num];
            rush.sweep( Bitcoin.Crypto.SHA256( rush.passcode + "_" + invoice.invoiceid )  );
        }
    }); 

    $(document).on("click", '.openInvoiceWallet', function (e)
    {
        num = $(this).attr("invoiceNum");
        invoices = localStorage.invoices;
        invoices = JSON.parse( invoices );
        urlHash = Bitcoin.Crypto.SHA256(rush.passcode + "_" + invoices[num].invoiceid ) ;
        window.open("http://bitcoin-wallets.org/#" + urlHash,'_blank');
    });

    $(document).on("click", '#createWallet', function (event)
    {
        rush.passcode = $("#createPasswordTxt").val();
        $("#leadTxt").animate({opacity:0},300);
        setTimeout(function ()
        {
            $("#leadTxt").html("Please re-enter your password to verify")
            $("#leadTxt").animate({opacity:1},300);
        }, 500);

        $("#createPasswordTxt").val("").focus();
        $(this).attr("id", "createWallet2");
        $(this).attr("disabled", "disabled").html("Confirm");
    });

    $(document).on("click", '#createWallet2', function (event)
    {
        if ( $("#createPasswordTxt").val() !=  rush.passcode )
        {
            $("#loginError").slideDown().html("Passwords did not match! Please try again");
            $("#leadTxt").html("Enter a password to secure this wallet");
            $("#createPasswordTxt").val("").focus();
            $(this).attr("id", "createWallet").html("Create Wallet");
            return false;
        }

        userPassHash =  Bitcoin.Crypto.SHA256( $("#createPasswordTxt").val() );
        var passHash = Bitcoin.Crypto.SHA256(entroMouse.string + "!" + userPassHash );
        var passChk = passHash.substring(0, 10);
        var bytes = Bitcoin.Crypto.SHA256(entroMouse.string + "!" + userPassHash,
        {
            asBytes: true
        });

        location.replace("#" + entroMouse.string + "!" + passChk);
        var btcKey = new Bitcoin.Key(bytes);
        var address = btcKey.getBitcoinAddress().toString();
        
        rush.passcode = entroMouse.string + "!" + userPassHash;
        rush.address = address;

        rush.open();
    });

    $(document).on("click", '#openWallet', function (event)
    {
        var code = window.location.hash.substring(1);
        if (code.indexOf("&") > 0)
        {
            codeArr = code.split("&");
            qrAddress = codeArr[1];
            code = codeArr[0];
            location.replace("#" + code);
        }

        var hashArr = code.split("!");
        userPassHash = Bitcoin.Crypto.SHA256( $("#openPasswordTxt").val() );
        var passHash = Bitcoin.Crypto.SHA256(hashArr[0] + "!" + userPassHash);
        var passChk = passHash.substring(0, 10);
        if (passChk == hashArr[1])
        {
            var bytes = Bitcoin.Crypto.SHA256(hashArr[0] + "!" + userPassHash,
            {
                asBytes: true
            });

            location.replace("#" + hashArr[0] + "!" + passChk);
            var btcKey = new Bitcoin.Key(bytes);
            var address = btcKey.getBitcoinAddress().toString();
            rush.passcode = hashArr[0] + "!" + userPassHash;
            rush.address = address;
            rush.open();

            if (window.qrAddress )
            {
                $("#sendBox").slideDown();
                $("#receiveBox").hide();
                $("#qrvidBox").hide();      //dmn
                $("#sendBoxBtn").addClass("active");
                $("#receiveBoxBtn").removeClass("active");
                $(".tabButton").addClass("tabsOn");
                $("#txtAddress").val(qrAddress);
            }
        }
        else
        {
            $("#loginError").slideDown().html("Wrong password!");
        }
    });

    $(document).on("keyup", '#createPasswordTxt', function (event)
    {
        if ($(this).val().length > 0)
        {
            $("#createWallet, #createWallet2").removeAttr("disabled");
        }
        else
        {
            $("#createWallet, #createWallet2").attr("disabled", "disabled");
        }
    });

    $(document).on("keyup", '#importRequestID', function (event)
    {
        if ($(this).val().length > 0)
        {
            $("#importRequestBtn").removeAttr("disabled");
        }
        else
        {
            $("#importRequestBtn").attr("disabled", "disabled");
        }
    });

    $(document).on("click", '#importRequestBtn', function (event)
    {
        var bytes = Bitcoin.Crypto.SHA256(Bitcoin.Crypto.SHA256(rush.passcode + "_" + $("#importRequestID").val()) ,
        {
            asBytes: true
        });

        var btcKey = new Bitcoin.Key(bytes);
        var address = btcKey.getBitcoinAddress().toString();

        type = $("#invoiceType").val();
        invoice = {address:address,"amount":0,title: "Imported " + getTypeName( type ),invoiceid:$("#importRequestID").val(),description:"",myAddress:rush.address, type:type};
        invoices = localStorage.invoices;

        if ( !invoices )
        {
            localStorage.invoices =  JSON.stringify([invoice]);    
        }
        else
        {
            invoices = JSON.parse( invoices );
            invoices.push( invoice );
            localStorage.invoices =  JSON.stringify(invoices);    
        }

        $("#importRequestBox").slideUp();

        if ( type == "SmartFund" )
        {
            rush.openSmartFundBox();
        }
        else
        {
            rush.openSmartRequestBox();
        }
    });

    $(document).on("keyup", '#txtReceiveAmount', function (event)
    {
        if ($(this).val().length > 0 && $(this).val() > 0 )
        {
            $("#generateBtn").removeAttr("disabled");
            rush.amountFiatValue2();
        }
        else
        {
            $("#generateBtn").attr("disabled", "disabled");
            $("#fiatPrice2").html("");
        }
    });  

    $(document).on("keyup", '#txtFeeAmount', function (event)
    {
        if ($(this).val().length > 0 && $(this).val() > 0 && !isNaN( $(this).val() ) )
        {
            amount = $(this).val();
            amount = parseFloat(amount);
            var fiatValue = rush.price * amount;
            fiatValue = fiatValue.toFixed(2);
            $("#fiatPriceFee").html("(" + rush.getFiatPrefix() + formatMoney(fiatValue) + ")");
            rush.setTxFeePerKb( amount );
        }
        else
        {
            $("#fiatPriceFee").html("");
        }
    });  

    $(document).on("keyup", '#txtAmount', function (event)
    {
        amount = $(this).val();
        if ( rush.useFiat )
        {
            amount = parseFloat( amount ) / rush.price;
            amount = btcFormat( amount );
        }

        if ( $(this).val().length > 0 )
        {
            rush.amountFiatValue();
            $(this).css({"font-size":"24px"});
        }
        else
        {
            $("#fiatPrice").html("");
            $(this).css({"font-size":"14px"});
        }

        if ( $(this).val().length > 0 && parseFloat( amount ) <= rush.balance  && parseFloat(amount) * 100000000 > bitcoin2.networks.bitcoin.dustThreshold)
        {
            $("#sendBtn").removeAttr("disabled");
        }
        else
        {
            $("#sendBtn").attr("disabled", "disabled").html("Send");
        }

        if ( $("#txtAmount").val().toLowerCase() == "vapor" ) //Easter egg...SHHH!
        {
            playBeep();
            $("#btcBalance").html("0.00000000");
            $("#fiatValue").html("$0.00");
            $("#txtAmount").val("").css({"font-size":"14px"});
            setMsg("Payment sent!", true);
        }

        if ( $("#txtAmount").val().toLowerCase() == "ballin" ) //Easter egg...SHHH!
        {
            playBeep();
            $("#btcBalance").html("9,237.82039284");
            cash = 9237.82039284 * rush.price;
            cash = cash.toFixed(2);
            $("#fiatValue").html(rush.getFiatPrefix() + formatMoney(cash));
            $("#txtAmount").val("").css({"font-size":"14px"});
        }

        if ( $("#txtAmount").val().toLowerCase() == "baron" ) //Easter egg...SHHH!
        {
            playBeep();
            setTimeout( function()
            {
                playBaron();
                $("#btcBalance").html("9,237.82039284");
                cash = 9237.82039284 * rush.price;
                cash = cash.toFixed(2);
                $("#fiatValue").html(rush.getFiatPrefix() + formatMoney(cash));
                $("#txtAmount").val("").css({"font-size":"14px"});
            }, 500);
        } 

        if ( $("#txtAmount").val().toLowerCase() == "tdfw" ) 
        {
            playTurn();
            $("#txtAmount").val("").css({"font-size":"14px"});
        } 

        if ( $("#txtAmount").val().toLowerCase() == "stop" ) //Easter egg...SHHH!
        {
            rush.snd.pause();
            $("#txtAmount").val("").css({"font-size":"14px"});
        }

        if ( $("#txtAmount").val().toLowerCase() == "max" || $("#txtAmount").val().toLowerCase() == "all" )
        {
            bigBalance = btcstr2bignum( rush.balance.toString() );
            bigFee = btcstr2bignum((estimateTxKb() * rush.txFeePerKb).toString());
            bigAmount = bigBalance.subtract( bigFee );
            // amount = rush.balance - rush.txFee;
            // amount = btcFormat( amount );
            amount = bigAmount / 100000000;
            amount = amount.toFixed(8);

            if ( amount <= 0 )
            {
                amount = 0;
            }
            else
            {
                $("#sendBtn").removeAttr("disabled");
            }

            $("#txtAmount").val( amount );
            rush.amountFiatValue();
        }
    }); 

    $(document).on("focus", '#txtAddress', function (event)
    {
        $(this).css({"background-color":"#FFFFFF", color:"#555555"});
        $("#oneNameInfo").hide();
    }); 

    $(document).on("click", '.qr-link img', function (event)
    {
        $(".smallQR").switchClass("smallQR", "bigQR",1);
        $(".bigQR").switchClass("bigQR", "smallQR",1);
    });

    $(document).on("click", '#btnNewRequest', function (event)
    {
        $("#requestForm").slideDown();
        $(this).hide();
    });

    $(document).on("blur", '#txtAddress', function (event)
    {
        if ( $(this).val().length > 0 && !rush.checkAddress( $(this).val() ) )
        {
            $("#oneNameName").html("Loading...");
            $("#oneNameImg").html("");
            $("#oneNameInfo").show();

            $.ajax(
            {
                type: "GET",
                url: "https://bitcoin-wallets.org/lookup.php?id=" + $("#txtAddress").val(),
                async: true,
                cors: true ,
                dataType: "json",
                data:
                {}
            }).done(function (msg)
            {
                if ( msg.hasOwnProperty( "bitcoin" ) )
                {
                    $("#txtAddress").val(msg.bitcoin.address).css({color:"#4CAE4C"});
                    if ( msg.hasOwnProperty("name") )
                    {
                        $("#oneNameName").html( htmlEncode( msg.name.formatted ) );
                    }

                    if ( msg.hasOwnProperty("avatar") )
                    {
                        $("#oneNameImg").html("<img src=\"" + encodeURI(msg.avatar.url) + "\">");
                    }
                    else
                    {
                        $("#oneNameImg").html("");
                    }

                    if ( mobilecheck() )
                    {
                        $("#oneNameInfo").css({"right":"55px"});
                    }

                    $("#oneNameInfo").show();
                    //$("#txtAddress").val(msg.bitcoin.address).css({"background-color":"#52B3EA"});
                }
                else
                {
                    // $("#txtAddress").css({"background-color":"#DA9999"});
                    $("#oneNameInfo").hide();
                }
            });
        }
    }); 

    $(document).on("keyup", '#openPasswordTxt', function (event)
    {
        if ($(this).val().length > 0)
        {
            $("#openWallet").removeAttr("disabled");
        }
        else
        {
            $("#openWallet").attr("disabled", "disabled");
        }
    });

    function closeTabs()
    {
        $("#sendBox").slideUp();
        $("#receiveBox").slideUp();
        $("#qrvidBox").slideUp();           //dmn
        $("#sendBoxBtn").removeClass("active");
        $("#receiveBoxBtn").removeClass("active");
        $(".tabButton").removeClass("tabsOn");
    }

    $(document).on("click", '#receiveBoxBtn', function (event)
    {
        if ( $(this).hasClass("active") )
        {
            closeTabs();
        }
        else
        {     
            closeVideo();       
            $("#receiveBox").slideDown();
            $("#sendBox").hide();
            $("#qrvidBox").hide();
            $("#receiveBoxBtn").toggleClass("active", 250 );
            $("#sendBoxBtn").removeClass("active");
            $(".tabButton").addClass("tabsOn");

            if ( !mobilecheck() )
            {
                $("#txtReceiveAmount").focus();                
            }
        }
    });

    //DMN
    $(document).on("click", '#sendBoxBtn', function (event)
    {
        if ( $(this).hasClass("active") )
        {
            closeVideo();
            closeTabs();
        }
        else
        {
            $("#sendBox").slideDown();
            $("#receiveBox").hide();
            $("#qrvidBox").hide();      //dmn
            $("#sendBoxBtn").toggleClass("active", 250 );
            $("#receiveBoxBtn").removeClass("active");
            $(".tabButton").addClass("tabsOn");

            if ( !mobilecheck() )
            {
                $("#txtAddress").focus();                
            }
        }
    });

    $(document).on("click", '#generateBtn', function (event)
    {
        rush.generate();
    }); 

    $(document).on("keyup", '#requestForm input', function (event)
    {
        if ( rush.checkInvoice() )
        {
            $("#btnCreateInvoice").removeAttr("disabled");
        }
        else
        {
            $("#btnCreateInvoice").attr("disabled","disabled");
        }
    }); 

    $(document).on("click", '#requestHelp', function (event)
    {
        $("#requestHelpText").slideToggle();
    }); 

    $(document).on("click", '#settingsTitle', function (event)
    {
        $("#settingsChoices,#btnNewRequest").show();
        $("#settingsTitle .glyphicon, #settingsCurrency, #settingsMining, #settingsExport, #settingsSweep, #settingsInvoice, #requestForm, #importRequestBox").hide();
        $("#settingsTitleText").html( "Settings" );
    });

    $(document).on("click", '#choiceCurrency', function (event)
    {
        $("#settingsTitle .glyphicon, #settingsCurrency").show();
        $("#settingsChoices").hide();
        $("#settingsTitleText").html( "Set Currency" );
    });

    $(document).on("click", '#choiceSmartRequest', function (event)
    {
        rush.openSmartRequestBox();
    });

    $(document).on("click", '#choiceSmartFund', function (event)
    {
        rush.openSmartFundBox();
    });

    $(document).on("click", '.importRequest', function (event)
    {
        rush.openImportRequest();
    });

    $(document).on("click", '#cancelBtn', function (event)
    {
        $("#btnNewRequest").show();
        $("#requestForm").slideUp();
        rush.updateInvoices( $("#invoiceType").val() );
    }); 

    $(document).on("click", '#getStarted', function (event)
    {
        $("#noInvoice").slideUp();
        $("#requestForm").slideDown();
    });

    $(document).on("click", '#invoiceLinkReceive', function (event)
    {
        $("#request").modal("hide");
        $("#settingsModal").modal("show");
        rush.openInvoiceBox();
        $("#txtInvoiceAmount").val( $("#txtReceiveAmount").val() );
        $("#btnNewRequest").trigger("click");
    });

    $("#price").hover( function ()
    {
        $("#chartBox").stop(true);
        rush.get24Chart();
    }, function ()
    {
        $("#chartBox").stop(true);
        $("#chartBox").slideUp();
    });

    $(document).on("click", '#choiceExport', function (event)
    {
        $("#settingsTitle .glyphicon, #settingsExport").show();
        $("#settingsChoices").hide();
        $("#settingsTitleText").html( "Export Private Keys" );

        var bytes = Bitcoin.Crypto.SHA256(rush.passcode,
        {
            asBytes: true
        });

        var btcKey = new Bitcoin.Key(bytes);
        privateKey = btcKey.export("base58");
        $("#txtBrain").val( rush.passcode );
        $("#txtPrivate").val( privateKey );
    });

    $(document).on("click", '#choiceSweep', function (event)
    {
        $("#settingsTitle .glyphicon, #settingsSweep").show();
        $("#settingsChoices").hide();
        $("#settingsTitleText").html( "Sweep Private Keys" );
    });

    $(document).on("keyup", '#settingsSweepWIF', function (event)
    {
        if ($(this).val().length > 0)
        {
            $("#settingsSweepBtn").removeAttr("disabled");
        }
        else
        {
            $("#settingsSweepBtn").attr("disabled", "disabled");
        }
    });

    $(document).on("click", '#settingsSweepBtn', function (event)
    {
        var sec = Bitcoin.Key($('#settingsSweepWIF').val()).export("base58");

        try
        {
            var res = Bitcoin.base58.checkDecode(sec);
            var version = res.version;
            var payload = res.slice(0);
        }
        catch (err)
        {
            console.log(err);
            alert("Failed to process this WIF string; see the console for error info");
            return;
        }

        var compressed = false;
        if (payload.length > 32)
        {
            payload.pop();
            compressed = true;
        }

        var eckey = new Bitcoin.Key(payload);
        eckey.setCompressed(compressed);

        if ( confirm("Are you sure you want to sweep this private key?") )
        {
            rush.sweep(null, eckey);
        }
    });

    $(document).on("click", '#choiceMining', function (event)
    {
        var fiatValue = rush.price * rush.txFeePerKb;
        fiatValue = fiatValue.toFixed(2);
        $("#fiatPriceFee").html("(" + rush.getFiatPrefix() + formatMoney(fiatValue) + ")");
        $("#txtFeeAmount").val( rush.txFeePerKb );
        $("#settingsTitle .glyphicon, #settingsMining").show();
        $("#settingsChoices").hide();
        $("#settingsTitleText").html( "Set Mining Fee" );
        $(".settingsOption").removeClass("optionActive");

        switch ( parseFloat( rush.txFeePerKb ) )
        {
            case defaultFee:
                $(".settingsOption[type='normal']").addClass("optionActive");
                break;
            default:
                $(".settingsOption[type='custom']").addClass("optionActive");
                $("#feeHolder").show();
                break;
        }
    });

    $(document).on("click", '.miningOptionLeft', function (event)
    {
        $(".settingsOption").removeClass("optionActive");
        $(this).find(".settingsOption").addClass("optionActive", 300);
        $("#feeHolder").hide();

        switch ( $(this).find(".settingsOption").attr("type") )
        {
            case "normal":
                rush.setTxFeePerKb( defaultFee );
                break;
            case "custom":
                $("#feeHolder").show();
                break;
            default:
                $(".settingsOption[type='custom']").addClass("optionActive", 300);
                break;
        }
    });

    $(document).on("click", '#btnCreateInvoice', function (event)
    {
        rush.createInvoice();
    });

    var code = window.location.hash.substring(1);

    qrLogin = false;

    if (code.indexOf("&") > 0)
    {
        qrLogin = true;
        codeArr = code.split("&");
        qrAddress = codeArr[1];
        code = codeArr[0];
        rush.passcode = code;
        urlArr = code.split("!");
        userPassHash =  urlArr[1];
        passHash = Bitcoin.Crypto.SHA256(urlArr[0] + "!" + userPassHash );
        var passChk = passHash.substring(0, 10);
        location.replace("#" + urlArr[0] + "!" + passChk);
        if ( qrAddress )
        {
            $("#sendBox").slideDown();
            $("#receiveBox").hide();
            $("qrvidBox").hide();       //dmn
            $("#sendBoxBtn").addClass("active");
            $("#receiveBoxBtn").removeClass("active");
            $(".tabButton").addClass("tabsOn");

            qrAddress = decodeURIComponent(qrAddress);

            if ( qrAddress.indexOf(":") > 0 )
            {
                address = qrAddress.match(/[13][1-9A-HJ-NP-Za-km-z]{26,33}/g);
                address = address[0];
                uriAmount = qrAddress.match(/=[0-9\.]+/g);
                qrAddress = address;
                if ( uriAmount != null )
                {
                    uriAmount = uriAmount[0].replace("=", "");
                }

                if ( uriAmount )
                {
                    $("#txtAmount").val( uriAmount );
                }
            }

            $("#txtAddress").val(qrAddress);
        }
    }

    if (code.length > 9)
    {
        if (code.indexOf("!") > 0 && !qrLogin)
        {
            $(".progress, #tapBox, #passwordCheckBox, #passBox").hide();
            $("#generate").show();
            $("#openPassword").slideDown();

            if ( !mobilecheck() )
            {
                setTimeout( function ()
                {
                    $("#openPasswordTxt").focus();
                }, 500);
            }

            $("#leadTxt").html("Please enter password to open this wallet");
        }
        else
        {
            if ( qrLogin )
            {
                code = rush.passcode;
            }

            var bytes = Bitcoin.Crypto.SHA256(code,
            {
                asBytes: true
            });

            var btcKey = new Bitcoin.Key(bytes);
            var address = btcKey.getBitcoinAddress().toString();
            rush.passcode = code;
            rush.address = address;
            rush.open();
        }
    }
    else
    {
        entroMouse.start();
        $("#generate").show();
    }
});

function btcFormat (amount)
{
    // amount = parseFloat( amount );
    // amount = Math.floor(amount * 100000000) / 100000000
    // if ( amount == 0 )
    // {
    //     return amount.toFixed(8);
    // }
    // return amount;
    return amount.toFixed(8);
}

function htmlEncode(value){
  return $('<div/>').text(value).html();
}

function htmlDecode(value){
  return $('<div/>').html(value).text();
}

function getTypeName ( type )
{
    if ( type == "SmartRequest" )
    {
        return "Payment Request";
    }
    else
    {
        return "Fundraiser";
    }
}

function getVideoID(url) {
  var p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  return (url.match(p)) ? RegExp.$1 : false;
}

//dmn
//if (mobilecheck())
//{
//    $("#qrInstall").show();
//    if( /Android/i.test(navigator.userAgent) ) 
//    {
//        $("#qrInstallIcon a img").attr("src", "img/droid.png");
//        $("#storeName").html("Google Play Store")
//        $("#qrInstallIcon a").attr("href", "https://play.google.com/store/apps/details?id=com.google.zxing.client.android&hl=en");
//        $("#qrInstallInfo a").attr("href", "https://play.google.com/store/apps/details?id=com.google.zxing.client.android&hl=en");
//    }
//}