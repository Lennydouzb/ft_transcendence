/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ft_exit.c                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: fgarnier <fgarnier@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/15 15:28:43 by fgarnier          #+#    #+#             */
/*   Updated: 2026/02/07 13:01:48 by fgarnier         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "../../includes/minishell.h"
#include <limits.h>

static int	is_all_digit(char *str)
{
	int	i;

	i = 0;
	if (str[i] == '-' || str[i] == '+')
		i++;
	if (!str[i])
		return (0);
	while (str[i])
	{
		if (!ft_isdigit(str[i]))
			return (0);
		i++;
	}
	return (1);
}

static void	exit_numeric_error(t_cmd *cmd, char ***env, t_cmd *first)
{
	ft_putstr_fd("minishell: exit: ", 2);
	ft_putstr_fd(cmd->args[1], 2);
	ft_putendl_fd(": numeric argument required", 2);
	ft_free_tab(*env);
	free_cmds(first);
	exit(2);
}

void	ft_exit(t_cmd *cmd, char ***env, t_cmd *first)
{
	__int128_t	res;

	if (cmd->args[1])
	{
		if (!is_all_digit(cmd->args[1]))
			exit_numeric_error(cmd, env, first);
		if (cmd->args[2])
		{
			ft_putendl_fd("minishell: exit: too many arguments", 2);
			return ;
		}
	}
	else if (!cmd->args[1])
	{
		ft_free_tab(*env);
		free_cmds(first);
		exit(0);
	}
	res = ft_atoll(cmd->args[1]);
	if (res > LLONG_MAX || res < LLONG_MIN)
		exit_numeric_error(cmd, env, first);
	ft_free_tab(*env);
	free_cmds(first);
	exit((long long)res % 256);
}
