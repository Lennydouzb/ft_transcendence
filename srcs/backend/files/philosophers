/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   routine.c                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <ldesboui@42angouleme.fr>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 16:39:46 by ldesboui          #+#    #+#             */
/*   Updated: 2026/01/17 12:55:32 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "../../includes/philosopher.h"
#include <pthread.h>

int	check_run(t_philo *philo)
{
	int	a;

	if (!philo || !philo->table)
		return (0);
	pthread_mutex_lock(&(philo->table->lockrun));
	a = philo->table->running;
	pthread_mutex_unlock(&(philo->table->lockrun));
	return (a);
}

void	print(int type, int nb, t_philo *phi)
{
	pthread_mutex_lock(&(phi->table->lock));
	if (check_run(phi) == 1 && type == 1)
		printf("%lld %d is thinking\n", get_relative_time(phi), nb);
	else if (check_run(phi) == 1 && type == 2)
		printf("%lld %d has taken a fork\n", get_relative_time(phi), nb);
	else if (check_run(phi) == 1 && type == 3)
		printf("%lld %d is eating\n", get_relative_time(phi), nb);
	else if (check_run(phi) == 1 && type == 4)
		printf("%lld %d is sleeping\n", get_relative_time(phi), nb);
	else if (check_run(phi) == 1 && type == 5)
		printf("%lld %d died\n", get_relative_time(phi), nb);
	pthread_mutex_unlock(&(phi->table->lock));
}

static int	grab_forks(t_philo *philo)
{
	if (check_run(philo) && philo->lfork != philo->rfork)
	{
		pthread_mutex_lock(&(philo->lfork->lock));
		print (2, philo->nb, philo);
		if (check_run(philo))
		{
			pthread_mutex_lock(&(philo->rfork->lock));
			print (2, philo->nb, philo);
		}
		else
		{
			pthread_mutex_unlock(&(philo->lfork->lock));
			return (0);
		}
	}
	else
	{
		print (2, philo->nb, philo);
		return (0);
	}
	return (1);
}

static void	*routine(void *arg)
{
	int	valid;

	pthread_mutex_lock(&((t_philo *)arg)->table->lockstart);
	pthread_mutex_unlock(&((t_philo *)arg)->table->lockstart);
	while (check_run(((t_philo *)arg)) == 1)
	{
		if (((t_philo *)arg)->nb % 2 == 0)
			usleep(1000);
		print(1, ((t_philo *)arg)->nb, ((t_philo *)arg));
		valid = grab_forks(((t_philo *)arg));
		if (valid == 0)
			return (NULL);
		print(3, ((t_philo *)arg)->nb, ((t_philo *)arg));
		updateeat(((t_philo *)arg));
		usleep(((t_philo *)arg)->tte * 1000);
		pthread_mutex_unlock(&(((t_philo *)arg)->lfork->lock));
		pthread_mutex_unlock(&(((t_philo *)arg)->rfork->lock));
		if (check_run(((t_philo *)arg)))
		{
			print(4, ((t_philo *)arg)->nb, ((t_philo *)arg));
			usleep(((t_philo *)arg)->tts * 1000);
		}
	}
	return (NULL);
}

void	launch_routine(t_table	*table)
{
	int	i;

	i = 0;
	pthread_mutex_lock(&(table->mu_hour));
	table->start_hour = get_time_in_ms();
	pthread_mutex_unlock(&(table->mu_hour));
	pthread_mutex_lock(&(table->lockstart));
	while (table->philos[i].lfork != NULL)
	{
		pthread_mutex_lock(&(table->philos[i].locklasteat));
		table->philos[i].lasteat = table->start_hour;
		pthread_mutex_unlock(&(table->philos[i].locklasteat));
		pthread_create(&(table->philos[i].thread_id), NULL, routine,
			&(table->philos[i]));
		++i;
	}
	pthread_create(&(table->monitor), NULL, monitor_routine, table);
	pthread_mutex_unlock(&(table->lockstart));
}
