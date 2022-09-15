let sendingFromAddress = document.getElementById("redeemFromBtn");
let transactionFee = document.getElementById("transactionFee");
let defaultBalance = document.getElementById("totalInputValue");
let sendingAddress = document.getElementById("transactionToogle");
let AddressSendingFrom = document.getElementById("AddressSendingFrom");
let address = document.getElementById("sendingAddress");
let addressfinal = document.getElementById("sendingToo");
let totalInput = document.getElementById("totalInput");
let totalInputValue = document.getElementById("ReturningBalance");
let inputval = document.getElementById("valuesub");
let remainval = document.getElementById("ReturningBalance");
sendingAddress.addEventListener("click", function () {
  totalInputValue.value = totalInput.innerHTML - transactionFee.value; 
  defaultBalance.value = totalInput.innerHTML - transactionFee.value;
  addressfinal.value = address.value;
});
 
$(document).on("input", "#valuesub", function () {
  var fee = (
    totalInput.innerHTML * 1 -
    inputval.value * 1 -
    transactionFee.value*1
  ).toFixed(8); 
  if(fee>0){

    remainval.value = fee;
  }else{
    
    remainval.value = "0.00";
  } 
  var fee2 = (
    totalInput.innerHTML * 1 -
    inputval.value * 1 -
    transactionFee.value * 1 -
    totalInputValue.value * 1
  ).toFixed(8);  
 
  if(fee2>0){

    defaultBalance.value = fee2;
  }else{
    
    defaultBalance.value = "0.000000";
  } 

});
$(document).on("input", "#transactionFee", function () {
  var tfee = (
    totalInput.innerHTML * 1 -
    inputval.value * 1 -
    transactionFee.value*1
  ).toFixed(8);
  if (tfee > 0) {
    remainval.value = tfee;
  } else {
    remainval.value = "0.00";
  }  
});


sendingFromAddress.addEventListener("click", function () {
  let addressFrom = document.getElementById("redeemFrom");
  let addressFromFinal = document.getElementById("sendingfrom");
  addressFromFinal.value = addressFrom.value;
  AddressSendingFrom.value = addressFrom.value;
});

let copyAddress = document.getElementById("copyBtn");
let copySigned = document.getElementById("copySigned");

copyAddress.addEventListener("click", function () {
  /* Get the text field */
  var copyText = document.getElementById("textToCopy");
  var copyfunc = document.getElementById("copyfunc");

  /* Select the text field */
  copyText.select();
  copyText.setSelectionRange(0, 99999); /* For mobile devices */

  /* Copy the text inside the text field */
  navigator.clipboard.writeText(copyText.value);

  /* Alert the copied text */
  copyfunc.classList.remove("hide-it");
});
copySigned.addEventListener("click", function () {
  /* Get the text field */
  var copysignData = document.getElementById("signTarData");
  var showSigned = document.getElementById("showSigned");

  /* Select the text field */
  copysignData.select();
  copysignData.setSelectionRange(0, 99999); /* For mobile devices */

  /* Copy the text inside the text field */
  navigator.clipboard.writeText(copysignData.value);

  /* Alert the copied text */
  showSigned.classList.remove("hide-it");
});
$("#transactionBtn").click(function () {
  console.log("vlicked", !$("#transactionFee").val());
  if ($("#transactionFee").val() == 0) {
    alert(
      "You must include a transacation fee to process this transacation on the Bitcoin Blockchain, this fee is paid directly to the miners, if you are unsure of the fee amount, Google Bitcoin transacation fee calculator and do your research."
    );
  }
});

  $("#signTransactionBtn").click(function () {
    $("#myModal").modal("hide");
    $("#signModal").modal("show");
  });
  $("#verifyTransactionBtn").click(function () {
    $("#myModal").modal("hide");
    $("#verifyModal").modal("show");
  });
  $("#goBackBtn").click(function () {
    $("#myModal").modal("show");
    $("#signModal").modal("hide");
  });