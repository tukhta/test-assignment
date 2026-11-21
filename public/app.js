const form = document.querySelector('#form');
const button = document.querySelector('#button');
const statusText = document.querySelector('#status');
const result = document.querySelector('#result');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  result.hidden = true;
  statusText.textContent = 'Скачиваем файл 10 раз. Подожди…';

  try {
    const response = await fetch('/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: document.querySelector('#url').value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    document.querySelector('#speed').textContent = `${data.speedMbps.toFixed(2)} Мбит/с`;
    document.querySelector('#average').textContent = `${data.averageSeconds.toFixed(2)} с`;
    document.querySelector('#size').textContent = `${data.totalBytes.toLocaleString('ru-RU')} байт`;
    result.hidden = false;
    statusText.textContent = 'Готово!';
  } catch (error) {
    statusText.textContent = `Ошибка: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
