<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Architecture

![Bids architecture](./assets/bids-architecture.png)

- **Caso 1: Un comprador se registra**
```mermaid
sequenceDiagram
CLIENT ->> SUBSCRIBER SERVICE: POST /buyers
SUBSCRIBER SERVICE->>REPOSITORY: POST /tags/{tag}/buyers
Note right of SUBSCRIBER SERVICE: QUEUE
Note right of REPOSITORY: Si encuentra subastas en esa tags
REPOSITORY-->>EVENT SERVICE: WS send({ "bids": {}, "to": "0.0.0.0", "event": CREATE})
EVENT SERVICE ->>CLIENT: POST /bids/{id} 
```

- **Caso 2: Un vendedor crea una subasta**
```mermaid
sequenceDiagram
CLIENT ->> SUBSCRIBER SERVICE: POST /bids
SUBSCRIBER SERVICE-->> CLIENT: 200 id
SUBSCRIBER SERVICE->>REPOSITORY: POST /tags/{tag}/bids
Note right of SUBSCRIBER SERVICE: QUEUE
Note right of REPOSITORY: Si encuentra compradores en esa tags
REPOSITORY-->>EVENT SERVICE: WS send({ "bids": {}, "to": "0.0.0.0", "event": "CREATE"})
EVENT SERVICE ->>BUYERS: POST /bids/{id} 
```
- **Caso 3: Un vendedor elimina una subasta**
```mermaid
sequenceDiagram
CLIENT ->> SUBSCRIBER SERVICE: DELETE /bids/{id}
SUBSCRIBER SERVICE->>REPOSITORY: DELETE /tags/{tag}/bids/{id}
Note right of SUBSCRIBER SERVICE: QUEUE
Note right of REPOSITORY: Si encuentra compradores en esa tags
REPOSITORY-->>EVENT SERVICE: WS send({ "bids": {}, "to": "0.0.0.0", "event": "DELETE"})
EVENT SERVICE ->>BUYERS: DELETE /bids/{id} 
```

- **Caso 4: Un comprador subasta un nuevo precio**
```mermaid
sequenceDiagram
CLIENT ->> SUBSCRIBER SERVICE: PUT /bids/{id}
SUBSCRIBER SERVICE->>REPOSITORY: POST /tags/{tag}/bids/{id}
Note right of SUBSCRIBER SERVICE: QUEUE
Note right of REPOSITORY: Si encuentra compradores en esa tags
REPOSITORY-->>EVENT SERVICE: WS send({ "bids": {}, "to": "0.0.0.0", "event": "MODIFY"})
EVENT SERVICE ->>BUYERS: POST /bids/{id} 
```

- **Caso 5: Se finaliza el plazo de la subasta**
```mermaid
sequenceDiagram
REPOSITORY-->>EVENT SERVICE: WS send({ "bids": {}, "to": "0.0.0.0", "event": "DELETE"})
EVENT SERVICE ->>BUYERS: DELETE /bids/{id} 
Note left of REPOSITORY: Si tiene compradores
```

## Endpoints
### Comprador
**POST** /bids/{id} 
> Notifica una creacion/modificacion de subasta al comprador

    {
      "price": 0,
      "duration": 3600,
      "article": {
        "name": "",
        "description": ""
      }
    }
**DELETE** /bids/{id}
> Notifica que se finalizo una subasta

    {
        "winner": {{name}},
        "price": 100
    }


### Servicio de subastas
**POST** /bids 
> El vendedor crea una subasta

    {                                      
      "tags": ["hogar", "muebles"]         
      "price": 0,                          
      "duration": 3600,                    
      "article": {                         
        "name": "",                        
        "description": ""                  
      }                                    
    }                                      

Response

    {
      "id": 1
    }
**DELETE** /bids/{{id}}
> El vendedor cancela la subasta

**POST** /buyers 
> El comprador se da de alta

    {
      "name": ""
      "ip": 0.0.0.0,
      "tags": ["hogar"]
     }

**PUT** /bids/{id} 
> El comprador oferta un nuevo precio

    {
      "price": 0,
      "ip": 0.0.0.0
    }

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
