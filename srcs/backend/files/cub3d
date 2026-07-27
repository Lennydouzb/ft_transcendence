/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   raycast.c                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: fgarnier <fgarnier@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/12/27 01:13:08 by fgarnier          #+#    #+#             */
/*   Updated: 2026/04/28 14:19:09 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "cub3d.h"

static void	init_step(t_game *game, t_ray *ray)
{
	if (ray->dir_x < 0)
	{
		ray->step_x = -1;
		ray->side_x = (game->player_x - ray->map_x) * ray->delta_x;
	}
	else
	{
		ray->step_x = 1;
		ray->side_x = (ray->map_x + 1.0 - game->player_x) * ray->delta_x;
	}
	if (ray->dir_y < 0)
	{
		ray->step_y = -1;
		ray->side_y = (game->player_y - ray->map_y) * ray->delta_y;
	}
	else
	{
		ray->step_y = 1;
		ray->side_y = (ray->map_y + 1.0 - game->player_y) * ray->delta_y;
	}
}

static void	init_ray(t_game *game, t_ray *ray, double angle)
{
	ray->map_x = (int)game->player_x;
	ray->map_y = (int)game->player_y;
	ray->dir_x = cos(angle);
	ray->dir_y = sin(angle);
	if (ray->dir_x == 0)
		ray->delta_x = 1e30;
	else
		ray->delta_x = fabs(1.0 / ray->dir_x);
	if (ray->dir_y == 0)
		ray->delta_y = 1e30;
	else
		ray->delta_y = fabs(1.0 / ray->dir_y);
}

double	shoot_ray(t_game *game, double angle, int *side_ret)
{
	t_ray	ray;

	init_ray(game, &ray, angle);
	init_step(game, &ray);
	perform_dda(game, &ray);
	if (ray.side == 0)
	{
		if (ray.dir_x > 0)
			*side_ret = 0;
		else
			*side_ret = 1;
		return (ray.side_x - ray.delta_x);
	}
	if (ray.dir_y > 0)
		*side_ret = 2;
	else
		*side_ret = 3;
	return (ray.side_y - ray.delta_y);
}

static int	get_tex_x(t_game *game, double dist, double angle, int side)
{
	double	wall_x;
	int		tex_x;

	if (side == 0 || side == 1)
		wall_x = game->player_y + dist * sin(angle);
	else
		wall_x = game->player_x + dist * cos(angle);
	wall_x -= floor(wall_x);
	tex_x = (int)(wall_x * 64.0);
	if ((side == 0 || side == 1) && cos(angle) < 0)
		tex_x = 64 - tex_x - 1;
	if ((side == 2 || side == 3) && sin(angle) > 0)
		tex_x = 64 - tex_x - 1;
	return (tex_x);
}

void	raycast(t_game *game)
{
	double		angle;
	double		step;
	int			side;
	t_draw_tex	draw;

	draw.x = 0;
	angle = game->player_angle - (M_PI / FOV);
	step = (M_PI / (FOV)) / (SCREEN_W) * 2;
	while (draw.x < SCREEN_W)
	{
		draw.dist = shoot_ray(game, angle, &side);
		if (side == 0)
			draw.tex = &game->tex_east;
		else if (side == 1)
			draw.tex = &game->tex_west;
		else if (side == 2)
			draw.tex = &game->tex_south;
		else
			draw.tex = &game->tex_north;
		draw.tex_x = get_tex_x(game, draw.dist, angle, side);
		draw.dist = draw.dist * cos(game->player_angle - angle);
		draw_wall_texture(game, &draw);
		angle += step;
		draw.x++;
	}
}
