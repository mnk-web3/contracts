#!/bin/bash

export DOCKER_BUILDKIT=1

# build truffle node
docker build -t compiler -f Compiler . && \
# build blockchain node
docker build -t ganache -f Blockchain . && \
# build pytest node
docker build -t tester -f Tester . && \
# compile and deploy contracts
docker-compose -f ./tests/docker-compose.yml run compiler && \
# run tests
docker-compose -f ./tests/docker-compose.yml run tester pytest $*

# cleanup
docker-compose -f ./tests/docker-compose.yml rm -fsv
