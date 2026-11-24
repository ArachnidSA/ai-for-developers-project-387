# Changelog

## [0.2.5](https://github.com/ArachnidSA/ai-for-developers-project-387/compare/v0.2.4...v0.2.5) (2026-11-24)


### Documentation

* описать воркфлоу opencode в README и дополнить команды в AGENTS.md ([9a3c4d3](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/9a3c4d39776e227de280960827859077a4a5f7fa))


### Continuous Integration

* брать ключ provod только из секрета PROVOD_API_KEY ([eb3f85a](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/eb3f85a4522953d7922f06abf5757ddfc2041f6b))
* держать конфиг provod вне репозитория, чтобы ран не открывал PR ([907b891](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/907b891120a3467b7fd42e0a17ce87a53b90716a))
* задавать провайдер provod.ai через opencode.json в CI ([c64c6a5](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/c64c6a577683ca986c4eb715e4b4d0c909d09ae3))
* задать набор mentions в opencode-воркфлоу явно ([9c4ffb4](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/9c4ffb4f2f9cba0d6c4b2ccd62ad7a35acdf6167))
* использовать доступную модель deepseek-flash в opencode-ране ([487d7a1](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/487d7a1f2f3d4bc0457ebb75ebe20cde6855c6ab))
* ограничить запуск opencode по комментариям ([b7e8594](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/b7e85945a13699d3556d2ac5304b433b4bbfdf02))
* подключать провайдер provod.ai для opencode в CI ([687620a](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/687620a64dde704817cb85971a61845b96573a25))
* создавать пустой render-api-key для конфига в opencode-ране ([8ee05ab](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/8ee05abe5bac4a72818ea57daee0f6de6fb8b496))

## [0.2.4](https://github.com/ArachnidSA/ai-for-developers-project-387/compare/v0.2.3...v0.2.4) (2026-11-24)


### Documentation

* наполнить README проектной информацией и адресом приложения ([0e45c8d](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/0e45c8d4902b703fbce27b0b8731e41d864a2678))

## [0.2.3](https://github.com/ArachnidSA/ai-for-developers-project-387/compare/v0.2.2...v0.2.3) (2026-11-24)


### Documentation

* уточнить условие авто-деплоя Render ([d9f370c](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/d9f370c5d1d113d110e5047055154fd8761bdd24))

## [0.2.2](https://github.com/ArachnidSA/ai-for-developers-project-387/compare/v0.2.1...v0.2.2) (2026-11-24)


### Documentation

* добавить раздел «Деплой (Render)» в README ([ca4c48f](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/ca4c48f7eb52ab43f0a590d8349acae57a02e103))


### Miscellaneous Chores

* привести render.yaml к сервису ai-for-developers-project-387 ([9586c80](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/9586c80691701c48f60a090f09c46aeb4a233ba5))

## [0.2.1](https://github.com/ArachnidSA/ai-for-developers-project-387/compare/v0.2.0...v0.2.1) (2026-11-23)


### Miscellaneous Chores

* **backend:** переименовать пакет и приложение на 387 ([47de505](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/47de5053c35ebd6daff7d8232f31267bda616758))

## [0.2.0](https://github.com/ArachnidSA/ai-for-developers-project-387/compare/v0.1.0...v0.2.0) (2026-11-23)


### Features

* перенести проект «Календарь звонков» в новый репозиторий ([e1c4ef8](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/e1c4ef8879f6e4409526544645924e2f2821c334))


### Documentation

* обновить адрес трекера и ссылки на первый проект ([c2ba0d2](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/c2ba0d29e3e8377138ea071f50a8721b027fd928))


### Continuous Integration

* запускать полную проверку mise run check ([931d379](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/931d379f3851556934f807a8811dce79f482e922))
* перезапустить проверки после включения прав Actions ([23dbb6b](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/23dbb6b1f6a5713d62f5fc243e2ff3da45fb05fa))
* перенести workflow opencode и release-please ([9dee5aa](https://github.com/ArachnidSA/ai-for-developers-project-387/commit/9dee5aac514d5b3eeb70b2c9c7b691687566e2b2))
