<p align="center">
  <img src="./images/okami-workers-logo.png" width="250" alt="Nest Logo" />
</p>



<p align="center">
  <strong style="font-size:40px">OKAMI WORKERS</strong>
</p>


## Description

OKAMI WORKERS is module for OKAMI run consumer workers OKAMI SERVER producers using redis database and bull.js


## Installation

For urn okami-server create a ```.env``` in de project dir

```bash
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
API_PORT=
OKAMI_BASE_URL=
```

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ docker compose up --build
```

## Test



## Other OKAMI modules 

- [OKAMI-WORKERS](https://github.com/luminuszz/okami-workers)
- [OKAMI-FRONT-END](https://github.com/luminuszz/okami-client)
- [OKAMI-SERVER](https://github.com/luminuszz/okami)

## License

Nest is [MIT licensed](LICENSE).
