/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ft_printf.c                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <marvin@42.fr>                    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 17:01:13 by ldesboui          #+#    #+#             */
/*   Updated: 2025/10/30 13:25:19 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "ft_printf.h"

static int	ft_get_type(const char *s)
{
	const char	*type = "cspdiuxX%";
	int			i;

	i = 0;
	while (type[i] != s[1])
		++i;
	return (i);
}

static void	ft_handle_mem(unsigned long mem, int *k, int order)
{
	const char	*base = "0123456789abcdef";
	char		c;

	c = 0;
	if (!mem)
		ft_putstr("(nil)", k);
	else
	{
		if (order == 0)
			ft_putstr("0x", k);
		c = base[mem % 16];
		if (mem / 16 >= 1)
		{
			++order;
			ft_handle_mem(mem / 16, k, order);
		}
		ft_putchar(c, k);
	}
}

static void	ft_handle_type(int c, va_list args, int *k)
{
	const char	*type = "cspdiuxX%";

	if (type[c] == 'c')
		ft_putchar(va_arg(args, int), k);
	else if (type[c] == 's')
		ft_putstr(va_arg(args, char *), k);
	else if (type[c] == 'p')
		ft_handle_mem(va_arg(args, unsigned long), k, 0);
	else if (type[c] == 'd')
		ft_putnbr_base(va_arg(args, int), "0123456789", k);
	else if (type[c] == 'i')
		ft_putnbr_base(va_arg(args, int), "0123456789", k);
	else if (type[c] == 'u')
		ft_putnbr_base(va_arg(args, unsigned int), "0123456789", k);
	else if (type[c] == 'x')
		ft_putnbr_base(va_arg(args, unsigned int), "0123456789abcdef", k);
	else if (type[c] == 'X')
		ft_putnbr_base(va_arg(args, unsigned int), "0123456789ABCDEF", k);
	else if (type[c] == '%')
		ft_putchar('%', k);
}

int	ft_printf(const char *s, ...)
{
	va_list	args;
	int		i;
	int		k;

	i = 0;
	k = 0;
	if (!s)
		return (-1);
	va_start(args, s);
	while (s[i])
	{
		if (s[i] == '%')
		{
			ft_handle_type(ft_get_type(&s[i]), args, &k);
			i += 2;
		}
		else
		{
			ft_putchar(s[i], &k);
			++i;
		}
	}
	va_end(args);
	return (k);
}
