/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   bresenham.c                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <ldesboui@42angouleme.fr>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/12/08 12:59:34 by ldesboui          #+#    #+#             */
/*   Updated: 2026/01/01 16:18:56 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "../../includes/fdf.h"

static int	absol(int value)
{
	if (value < 0)
		return (-value);
	return (value);
}

static void	calculate_move(t_pixel *fst, int *err, t_coef coef, t_step step)
{
	int	err2;

	err2 = *err * 2;
	if (err2 > -(coef.dy))
	{
		*err -= coef.dy;
		fst->x += step.sx;
	}
	if (err2 < coef.dx)
	{
		*err += coef.dx;
		fst->y += step.sy;
	}
}

static void	trace(t_pixel fst, t_pixel snd, t_mlx *mlx)
{
	t_coef	coef;
	int		err;
	t_step	step;

	step.sx = -1;
	step.sy = -1;
	if (fst.x < snd.x)
		step.sx = 1;
	if (fst.y < snd.y)
		step.sy = 1;
	coef.dx = absol(snd.x - fst.x);
	coef.dy = absol(snd.y - fst.y);
	err = coef.dx - coef.dy;
	if (fst.x == snd.x && fst.y == snd.y)
		return ;
	calculate_move(&fst, &err, coef, step);
	while (1)
	{
		if (fst.x == snd.x && fst.y == snd.y)
			return ;
		if (fst.x >= 0 && fst.x < 1920 && fst.y >= 0 && fst.y < 1080)
			mlx_set_image_pixel(mlx->mlx, mlx->img,
				fst.x, fst.y, (mlx_color){.rgba = 0x0000FFFF});
		calculate_move(&fst, &err, coef, step);
	}
}

void	bresenham(t_point *points, t_sizemap *size, t_mlx *mlx)
{
	int	x;
	int	y;

	y = 0;
	while (y < size->size_y)
	{
		x = 0;
		while (x < size->size_x)
		{
			if (x < size->size_x - 1)
				trace((t_pixel){.x = points[x + size->size_x * y].screen_x,
					.y = points[x + size->size_x * y].screen_y},
					(t_pixel){.x = points[x + 1 + size->size_x * y].screen_x,
					.y = points[x + 1 + size->size_x * y].screen_y}, mlx);
			if (y < size->size_y - 1)
				trace((t_pixel){.x = points[x + size->size_x * y].screen_x,
					.y = points[x + size->size_x * y].screen_y},
					(t_pixel){.x = points[x + size->size_x * (y + 1)].screen_x,
					.y = points[x + size->size_x * (y + 1)].screen_y}, mlx);
			++x;
		}
		++y;
	}
}
