/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   physics.c                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: rcompain <rcompain@student.42angouleme.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/06 13:33:52 by rcompain          #+#    #+#             */
/*   Updated: 2026/05/01 16:42:32 by rcompain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "../../include/minirt_bonus.h"
#include "../../include/physics_bonus.h"
#include "../../include/world_bonus.h"
#include <stdlib.h>

/* verlet : new_pos = (2 * cur) - prev + acc*dt^2 */
static void	calc_new_pos(t_vec *cur_pos, t_vec *prev_pos, t_physics *param)
{
	t_vec	tmp_pos;
	t_vec	new_pos;

	vec_init(&tmp_pos, cur_pos->x, cur_pos->y, cur_pos->z);
	new_pos = vec_add(
			vec_sub(vec_mult_scalar(tmp_pos, 2.0), *prev_pos),
			vec_mult_scalar(param->acc, DT * DT));
	vec_init(cur_pos, new_pos.x, new_pos.y, new_pos.z);
	vec_init(prev_pos, tmp_pos.x, tmp_pos.y, tmp_pos.z);
}

void	recalcul_pos_obj(t_world *w, int i)
{
	t_physics	*p;

	if (i < w->nb_obj && w->objects[i].physics_enabled)
	{
		p = &w->objects[i].shape.sphere.param;
		calc_new_pos(&p->cur_pos, &p->prev_pos, p);
		w->objects[i].shape.sphere.center = p->cur_pos;
		w->objects[i].shape.sphere.rotation
			+= w->objects[i].shape.sphere.rotation_speed;
		if (w->objects[i].shape.sphere.rotation > 2 * PI)
			w->objects[i].shape.sphere.rotation -= 2 * PI;
	}
	if (i < w->nb_sun)
	{
		p = &w->suns[i].param;
		calc_new_pos(&p->cur_pos, &p->prev_pos, p);
	}
}

void	recalcul_physics(t_data *d, t_world *w)
{
	int	i;
	int	j;

	i = -1;
	while (++i < 3)
	{
		pthread_mutex_lock(&d->pool.queue);
		d->pool.job_idx = 0;
		d->pool.start = true;
		if ((w->nb_obj >= w->nb_sun && i != 1) || i == 2)
			d->pool.nbr_jobs = w->nb_obj;
		else
			d->pool.nbr_jobs = w->nb_sun;
		if (i == 0)
			d->pool.mod = PHYS_ACC;
		else if (i == 1)
			d->pool.mod = PHYS_SUN;
		else
			d->pool.mod = PHYS_POS;
		pthread_cond_broadcast(&d->pool.cond);
		pthread_mutex_unlock(&d->pool.queue);
		j = -1;
		while (++j < d->pool.nbr_jobs)
			sem_wait(&d->pool.sem);
	}
}
