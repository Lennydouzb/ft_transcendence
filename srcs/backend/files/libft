/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ft_strlcat.c                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <marvin@42.fr>                    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/14 13:39:42 by ldesboui          #+#    #+#             */
/*   Updated: 2025/10/22 19:09:28 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "libft.h"

size_t	ft_strlcat(char *dst, const char *src, size_t size)
{
	size_t	i;
	size_t	dst_size;
	size_t	src_size;

	i = 0;
	src_size = ft_strlen(src);
	if (size == 0)
		return (src_size);
	dst_size = ft_strlen(dst);
	if (dst_size >= size)
		return (size + src_size);
	while (i < src_size && i < (size - dst_size - 1))
	{
		dst[dst_size + i] = src[i];
		++i;
	}
	dst[dst_size + i] = '\0';
	return (dst_size + src_size);
}
