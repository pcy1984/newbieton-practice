import './style.css'

document.querySelector('#app').innerHTML = `
  <h1>뉴비톤 연습</h1>
  <p>이름을 입력해보세요.</p>

  <input id="nameInput" placeholder="이름 입력">

  <button id="helloButton">인사하기</button>

  <p id="result"></p>
`

const button = document.querySelector('#helloButton')

button.addEventListener('click', () => {
  const name = document.querySelector('#nameInput').value

  document.querySelector('#result').textContent =
    `${name}님 안녕하세요!`
})