/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   get_next_line.c                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <ldesboui@42angouleme.fr>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/11/02 16:21:00 by ldesboui          #+#    #+#             */
/*   Updated: 2025/11/04 07:14:55 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "get_next_line.h"

void	boosted_free(char **s)
{
	if (*s)
	{
		free(*s);
		*s = NULL;
	}
}

void	freeall(char **s1, char **s2)
{
	if (*s1)
		boosted_free(s1);
	if (*s2)
		boosted_free(s2);
}

static void	get_strings(char **buf, char **res, ssize_t *index)
{
	if (res && buf)
	{
		*buf = ft_substr(*res, *buf, 0, *index + 1);
		*res = ft_substr(*res, *res, *index + 1, ft_strlen(*res) - *index);
	}
}

char	*get_next_line(int fd)
{
	char		*buffer;
	int			size_read;
	static char	*res;
	ssize_t		index;

	size_read = 1;
	buffer = (char *)malloc(BUFFER_SIZE + 1);
	if (!buffer)
		return (NULL);
	index = ft_strchr(res, '\n', 1);
	while (size_read > 0 && index == -1)
	{
		size_read = read(fd, buffer, BUFFER_SIZE);
		if (size_read > 0)
		{
			buffer[size_read] = '\0';
			res = ft_strjoin(res, buffer);
		}
		index = ft_strchr(res, '\n', size_read);
	}
	if (index == -1 && size_read <= 0)
		freeall(&buffer, &res);
	get_strings(&buffer, &res, &index);
	return (buffer);
}
