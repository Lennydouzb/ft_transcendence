LOGIN=ldesboui
ORIGIN=/home/$(LOGIN)/data
MANDA_DIR_MARIA = $(ORIGIN)/mariadb
MANDA_DIR_WORDPRESS = $(ORIGIN)/wordpress
BONUS_DIR_ADMINER = $(ORIGIN)/adminer
BONUS_DIR_STATIC_SITE = $(ORIGIN)/static_site

all: start

start:
	mkdir -p $(MANDA_DIR_MARIA)
	mkdir -p $(MANDA_DIR_WORDPRESS)
	mkdir -p $(BONUS_DIR_ADMINER)
	mkdir -p $(BONUS_DIR_STATIC_SITE)
	docker compose -f ./srcs/docker-compose.yml up -d

fclean: clean
	docker system prune -af

clean: stop
	rm -rf $(ORIGIN)

stop:
	docker compose -f ./srcs/docker-compose.yml down

re: fclean all

.PHONY: all fclean clean re
