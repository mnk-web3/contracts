#!/bin/bash

export DOCKER_BUILDKIT=1

docker build -t compiler -f Compiler . && \
docker build -t ganache -f ./tests/Blockchain ./tests && \
docker build -t tester -f ./tests/Tester ./tests && \
docker-compose -f ./tests/docker-compose.yml run compiler && \
docker-compose -f ./tests/docker-compose.yml run tester pytest

# cleanup
docker-compose -f ./tests/docker-compose.yml rm -fsv
