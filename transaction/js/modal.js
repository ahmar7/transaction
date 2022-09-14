let sendingAddress = document.getElementById("transactionToogle");

sendingAddress.addEventListener("click", function () {
  let address = document.getElementById("sendingAddress");
  let addressfinal = document.getElementById("sendingToo");
  let totalInput = document.getElementById("totalInput");
  let totalInputValue = document.getElementById("totalInputValue");
  totalInputValue.value = totalInput.innerHTML;

  addressfinal.value = address.value;
});

let sendingFromAddress = document.getElementById("redeemFromBtn");

sendingFromAddress.addEventListener("click", function () {
  let addressFrom = document.getElementById("redeemFrom");
  let addressFromFinal = document.getElementById("sendingfrom");
  addressFromFinal.value = addressFrom.value;
});

let copyAddress = document.getElementById("copyBtn");

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
$("#transactionBtn").click(function () {
  console.log("vlicked", !$("#transactionFee").val());
  if ($("#transactionFee").val() == 0) {
    alert(
      "You must include a transacation fee to process this transacation on the Bitcoin Blockchain, this fee is paid directly to the miners, if you are unsure of the fee amount, Google Bitcoin transacation fee calculator and do your research."
    );
  }
});
