let passesValidation = false;

function validate(){
  if (!passesValidation) {event.preventDefault()};
}
var check = function() {
  if (document.getElementById('password').value == document.getElementById('confirm_password').value) {
    passesValidation = true;
     document.getElementById('message').style.color = 'green';
   document.getElementById('message').innerHTML = 'Passwords are matching';
   document.getElementById('confirm_password').classList.add("password-match");
  } else {
    passesValidation = false;
     document.getElementById('message').style.color = 'red';
     document.getElementById('message').innerHTML = 'Passwords does not match';
    document.getElementById('confirm_password').classList.add("password-not-match");
  }
}
setTimeout(()=>{
  const orderbox = document.getElementById('order_placed_message');
  orderbox.style.display = 'none';
}, 1000)
setTimeout(() => {
  const box = document.getElementById('login_message');
  box.style.display = 'none';
}, 2000); // 👈️ time in milliseconds
