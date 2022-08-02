#!/bin/bash


export DOCKER_BUILDKIT=1


SCRIPT_DIR=$(dirname $(realpath $0))
export ENVFILE="${1:-"tests/envs/localnet.env"}"


if ! [[ -r $(realpath $ENVFILE) ]]
then
    echo "Fatal: Env file $(realpath $ENVFILE) does not exist."
    exit 1
fi


if [[ $ENVFILE == *"localnet"* ]]
then
    COMPOSE_FILE="docker-compose-localnet.yml"
    BLOCKCHAIN_BUILD_COMMAND="docker build -t ganache -f $SCRIPT_DIR/DockerfileBlockchain $SCRIPT_DIR"
else
    COMPOSE_FILE="docker-compose-publicnet.yml"
    BLOCKCHAIN_BUILD_COMMAND="true"
fi

# build truffle node
docker build -t compiler -f $SCRIPT_DIR/DockerfileCompiler $SCRIPT_DIR && \
# build blockchain node, this step is optional, depending on the network selected
sh -c "$BLOCKCHAIN_BUILD_COMMAND" && \
# build pytest node
docker build -t tester -f DockerfilePytester . && \
# compile and deploy contracts
docker-compose -f $SCRIPT_DIR/$COMPOSE_FILE -- run compiler && \
# run tests
docker-compose -f $SCRIPT_DIR/$COMPOSE_FILE -- run tester poetry run pytest --asyncio-mode=auto ${@:2}

# cleanup
docker-compose -f $SCRIPT_DIR/$COMPOSE_FILE rm -fsv
