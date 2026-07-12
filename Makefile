LOGIN=ldesboui
ORIGIN=/home/$(LOGIN)/data
MANDA_DIR_MARIA = $(ORIGIN)/mariadb

all: start

start:
	mkdir -p $(MANDA_DIR_MARIA)
	docker compose -f ./docker/docker-compose.yml up -d

fclean: clean
	docker system prune -af

clean: stop
	rm -rf $(ORIGIN)

stop:
	docker compose -f ./docker/docker-compose.yml down

re: fclean all

.PHONY: all fclean clean re
