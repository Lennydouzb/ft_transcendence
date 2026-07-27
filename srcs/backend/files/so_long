/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   moves_basic_bonus.c                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: linux-babass <linux-babass@student.42.f    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/06/08 21:25:44 by bamagere          #+#    #+#             */
/*   Updated: 2026/05/04 18:18:31 by linux-babas      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "so_long_bonus.h"

static void	finish_valid_move(t_mlx_data *d)
{
	d->game->moves++;
	ft_printf("%sScore : %s%d\n", YEL, NC, d->game->moves);
	if (monster_win(d))
	{
		game_won(d->game, d, 'm');
		return ;
	}
	decrement_monster_sleep(d);
	move_monsters(d);
	if (monster_win(d))
		game_won(d->game, d, 'm');
}

void	move_up(t_mlx_data *d)
{
	if (d->game->map[d->hero.hero_posy - 1][d->hero.hero_posx] != '1')
	{
		if (d->game->map[d->hero.hero_posy - 1][d->hero.hero_posx] == 'C')
			d->game->nb_collectible--;
		d->game->map[d->hero.hero_posy - 1][d->hero.hero_posx] = 'P';
		d->game->map[d->hero.hero_posy][d->hero.hero_posx] = '0';
		d->hero.hero_posy--;
		finish_valid_move(d);
	}
	d->game->flag = 2;
	d->hero.hero_dir_x = 0;
	d->hero.hero_dir_y = -1;
}

void	move_down(t_mlx_data *d)
{
	if (d->game->map[d->hero.hero_posy + 1][d->hero.hero_posx] != '1')
	{
		if (d->game->map[d->hero.hero_posy + 1][d->hero.hero_posx] == 'C')
			d->game->nb_collectible--;
		d->game->map[d->hero.hero_posy + 1][d->hero.hero_posx] = 'P';
		d->game->map[d->hero.hero_posy][d->hero.hero_posx] = '0';
		d->hero.hero_posy++;
		finish_valid_move(d);
	}
	d->game->flag = 3;
	d->hero.hero_dir_x = 0;
	d->hero.hero_dir_y = 1;
}

void	move_left(t_mlx_data *d)
{
	if (d->game->map[d->hero.hero_posy][d->hero.hero_posx - 1] != '1')
	{
		if (d->game->map[d->hero.hero_posy][d->hero.hero_posx - 1] == 'C')
			d->game->nb_collectible--;
		d->game->map[d->hero.hero_posy][d->hero.hero_posx - 1] = 'P';
		d->game->map[d->hero.hero_posy][d->hero.hero_posx] = '0';
		d->hero.hero_posx--;
		finish_valid_move(d);
	}
	d->game->flag = 0;
	d->hero.hero_dir_x = -1;
	d->hero.hero_dir_y = 0;
}

void	move_right(t_mlx_data *d)
{
	if (d->game->map[d->hero.hero_posy][d->hero.hero_posx + 1] != '1')
	{
		if (d->game->map[d->hero.hero_posy][d->hero.hero_posx + 1] == 'C')
			d->game->nb_collectible--;
		d->game->map[d->hero.hero_posy][d->hero.hero_posx + 1] = 'P';
		d->game->map[d->hero.hero_posy][d->hero.hero_posx] = '0';
		d->hero.hero_posx++;
		finish_valid_move(d);
	}
	d->game->flag = 1;
	d->hero.hero_dir_x = 1;
	d->hero.hero_dir_y = 0;
}
