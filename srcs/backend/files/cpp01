/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Harl.cpp                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <ldesboui@42angouleme.fr>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/06 11:24:57 by ldesboui          #+#    #+#             */
/*   Updated: 2026/03/08 14:39:20 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "Harl.hpp"

Harl::Harl ( void )
{
	this->level = 0;
}

void	Harl::_debug( void )
{
	if (this->level <= 0 && this->level != -1)
	{
		std::cout << "[debug]   || I love having extra bacon for my 7XL-double-cheese-triple";
		std::cout << "-pickle-special-ketchup burger. I really do!" << std::endl;
	}
}

void	Harl::_info( void )
{
	if (level <= 1 && this->level != -1)
	{
		std::cout << "[info]    || I cannot believe adding extra bacon costs more money. You didn’t put";
		std::cout << "enough bacon in my burger! If you did, I wouldn’t be asking for more!" << std::endl;
	}
}

void	Harl::_warning( void )
{
	if (this->level <= 2 && this->level != -1)
	{
		std::cout << "[warning] || I think I deserve to have some extra bacon for free. I’ve been coming for";
		std::cout << "years, whereas you started working here just last month." << std::endl;
	}
}

void	Harl::_error( void )
{
	if (this->level <= 3 && this->level != -1)
		std::cout << "[error]   || This is unacceptable! I want to speak to the manager now." << std::endl;
}

void	Harl::complain(std::string level)
{
	std::string levels[4] = {"DEBUG", "INFO", "WARNING", "ERROR"};
	int	i = 0;

	while (i < 4)
	{
		if (level == levels[i])
		{
			break;
		}
		++i;
	}
	switch (i)
	{
		case 0:
			this->_debug();
			break;
		case 1:
			this->_info();
			break;
		case 2:
			this->_warning();
			break;
		case 3:
			this->_error();
			break;
		default:
			std::cout << "[ Probably complaining about insignificant problems ]" << std::endl;
			break;
	}
}

void	Harl::setLevel(std::string level)
{

	std::string levels[4] = {"DEBUG", "INFO", "WARNING", "ERROR"};
	int	i = 0;

	while (i < 4)
	{
		if (level == levels[i])
		{
			this->level = i;
			return ;
		}
		++i;
	}
	this->level = -1;
}
