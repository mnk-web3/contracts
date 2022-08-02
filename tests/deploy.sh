#!/bin/bash


export DOCKER_BUILDKIT=1


SCRIPT_DIR=$(dirname $(realpath $0))
export ENVFILE="${1:-"tests/envs/localnet.env"}"


if ! [[ -r $(realpath $ENVFILE) ]]
then
    echo "Fatal: Env file $(realpath $ENVFILE) does not exist."
    exit 1
fi


# build truffle node
docker build -t compiler -f $SCRIPT_DIR/DockerfileCompiler $SCRIPT_DIR && \
# run the compiler
docker-compose -f $SCRIPT_DIR/docker-compose-publicnet.yml -- run compiler

# cleanup
docker-compose -f $SCRIPT_DIR/docker-compose-publicnet.yml rm -fsv
