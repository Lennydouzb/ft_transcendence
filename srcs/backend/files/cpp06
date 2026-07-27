/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Base.cpp                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <ldesboui@42angouleme.fr>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/26 17:29:50 by ldesboui          #+#    #+#             */
/*   Updated: 2026/05/13 11:09:01 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "Base.hpp"

#include "B.hpp"
#include "A.hpp"
#include "C.hpp"
Base::~Base()
{
}

Base * generate(void)
{
	srand(std::time(NULL));
	switch (std::rand() % 3)
	{
		case 0:
			return (new A);
			break;
		case 1:
			return (new B);
			break;
		case 2:
			return (new C);
			break;
		default:
			return (new A);
	}
}
void identify(Base* p)
{
	if (dynamic_cast<A*>(p))
	{
		std::cout << "It's an A" << std::endl;
		return ;
	}
	if (dynamic_cast<B*>(p))
	{
		std::cout << "It's a B" << std::endl;
		return ;
	}
	if (dynamic_cast<C*>(p))
	{
		std::cout << "It's a C" << std::endl;
		return ;
	}
}

void identify(Base& p)
{
	try
	{
		A& a = dynamic_cast<A&>(p);
		(void)a;
		std::cout << "It's an A" << std::endl;
		return ;
	}
	catch (std::exception &e)
	{
	}
	try
	{
		B& b = dynamic_cast<B&>(p);
		(void)b;
		std::cout << "It's a B" << std::endl;
		return ;
	}
	catch (std::exception &e)
	{
	}
	try
	{
		C& c = dynamic_cast<C&>(p);
		(void)c;
		std::cout << "It's a C" << std::endl;
		return ;
	}
	catch (std::exception &e)
	{
	}
}
